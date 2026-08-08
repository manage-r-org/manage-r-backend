import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { AuthRepository, UserWithRole } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
  RegisteredUserResponse,
  toMeResponse,
  toRegisteredUserResponse,
} from './mappers/auth.mapper';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/exceptions';
import { ERROR_MESSAGES } from '../../common/constants';
import { Role } from '../../common/enums/role.enum';
import { IAuthenticatedUser } from '../../common/interfaces';
import { AppConfigService } from '../../config/app-config.service';
import { comparePassword, hashPassword } from '../../common/utils';

/**
 * Claims embedded in both the access and refresh JWTs. Mirrors the contract
 * that JwtStrategy / JwtRefreshStrategy validate: `sub` becomes
 * `IAuthenticatedUser.id`, plus `email` and `roles`. No sensitive data is
 * ever placed inside a token.
 */
interface AuthTokenPayload {
  sub: string;
  email: string;
  roles: Role[];
}

/**
 * AuthService — authentication business logic.
 *
 * Registration flow:
 *   1. Check the unique fields are not already taken.
 *   2. Hash the plain-text password (never stored in plain text).
 *   3. Create the account (and its empty profile) through the repository.
 *   4. Convert duplicate database errors into project ConflictExceptions.
 *   5. Return only sanitized user data.
 *
 * Login flow:
 *   1. Find the account by username or email.
 *   2. Verify the password against the stored bcrypt hash.
 *   3. Reject with one generic error for both unknown user and wrong password.
 *   4. Sign access + refresh JWTs and return them.
 *
 * Refresh flow:
 *   1. Verify the refresh-token signature and expiry (refresh secret only).
 *   2. Load the account by the `sub` claim from the database.
 *   3. Reject unknown or disabled accounts.
 *   4. Sign a fresh access token with the same mechanism as login.
 * Refresh tokens are stateless and are not rotated (see RefreshResponse).
 *
 * Logout flow:
 *   Identity comes from the verified access token (@CurrentUser()). Because
 *   refresh tokens are stateless, nothing is revoked server-side — the client
 *   discards its tokens and the endpoint logs the event and returns success.
 *
 * Current-user flow:
 *   1. Load the account by the authenticated user's id (from the JWT).
 *   2. Reject unknown or disabled accounts.
 *   3. Map the account (with its current role) into a safe response.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(dto: RegisterDto): Promise<RegisteredUserResponse> {
    await this.assertFieldsAvailable(dto);

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.authRepository.createUserWithProfile({
        username: dto.username,
        email: dto.email,
        phoneNumber: dto.phoneNumber ?? null,
        passwordHash,
      });

      this.logger.info(
        { event: 'user_registered', userId: user.user_id.toString() },
        'User registered',
      );
      return toRegisteredUserResponse(user);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw this.buildDuplicateException(error);
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.authRepository.findByLoginIdentifier(dto.identifier);

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const passwordMatches = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!user.is_active) {
      throw new ForbiddenException(ERROR_MESSAGES.ACCOUNT_DISABLED);
    }

    const payload = this.buildAuthTokenPayload(user);
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    this.logger.info(
      { event: 'user_logged_in', userId: user.user_id.toString() },
      'User logged in',
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenTtlSeconds(accessToken),
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<RefreshResponse> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.authRepository.findByIdWithRole(payload.sub);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    if (!user.is_active) {
      throw new ForbiddenException(ERROR_MESSAGES.ACCOUNT_DISABLED);
    }

    const accessToken = await this.signAccessToken(this.buildAuthTokenPayload(user));

    this.logger.info(
      { event: 'access_token_refreshed', userId: user.user_id.toString() },
      'Access token refreshed',
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenTtlSeconds(accessToken),
    };
  }

  /**
   * Logout flow:
   *   1. The identity comes from the verified access token (JwtAuthGuard +
   *      @CurrentUser()), never from the request body — so a client cannot
   *      log out another account.
   *   2. Refresh tokens are stateless JWTs that are not persisted, so there
   *      is nothing to revoke server-side. The client discards both tokens.
   *   3. Log the event and return success. Safe to call repeatedly.
   */
  logout(user: IAuthenticatedUser): LogoutResponse {
    this.logger.info({ event: 'user_logged_out', userId: user.id }, 'User logged out');

    return { message: 'Logout successful.', data: null };
  }

  /**
   * Current-user flow:
   *   1. The identity comes from the verified access token (JwtAuthGuard +
   *      @CurrentUser()); the client never supplies a userId.
   *   2. Load the account by that id and reject accounts that no longer exist
   *      (404) or have been disabled (403, same as login/refresh).
   *   3. Return a safe account response including the current role from the
   *      database.
   */
  async getMe(user: IAuthenticatedUser): Promise<MeResponse> {
    const account = await this.authRepository.findByIdWithRole(user.id);

    if (!account) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (!account.is_active) {
      throw new ForbiddenException(ERROR_MESSAGES.ACCOUNT_DISABLED);
    }

    return toMeResponse(account);
  }

  /**
   * Verifies a refresh token against the refresh secret and returns its
   * claims. Rejects expired, malformed, wrong-secret, and access tokens with
   * one generic error — details are logged internally but never returned.
   */
  private async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
        secret: this.config.jwtRefreshSecret,
      });
    } catch (error) {
      this.logger.warn(
        { event: 'refresh_token_rejected', reason: this.tokenErrorName(error) },
        'Refresh token rejected',
      );
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  private tokenErrorName(error: unknown): string {
    return error instanceof Error ? error.name : 'UnknownError';
  }

  /**
   * Builds the minimal JWT claims for an account. `sub` is the BIGINT id as a
   * string, plus the account email and role loaded from the database. Never
   * includes passwords, hashes, or other sensitive data.
   */
  private buildAuthTokenPayload(user: UserWithRole): AuthTokenPayload {
    return {
      sub: user.user_id.toString(),
      email: user.email,
      roles: [user.sec_role.role_name as Role],
    };
  }

  /**
   * Signs an access token with the JwtModule default (access secret and
   * expiration) — the same mechanism used at login.
   */
  private signAccessToken(payload: AuthTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  /**
   * Signs a refresh token with the dedicated refresh secret and expiration.
   */
  private signRefreshToken(payload: AuthTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiration,
    });
  }

  /**
   * Reads the `exp` claim from the freshly signed access token and returns
   * the remaining validity in seconds (never negative).
   */
  private getAccessTokenTtlSeconds(accessToken: string): number {
    const decoded = this.jwtService.decode<{ exp: number }>(accessToken);
    if (!decoded) {
      return 0;
    }
    return Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
  }

  private async assertFieldsAvailable(dto: RegisterDto): Promise<void> {
    const [userByUsername, userByEmail, userByPhone] = await Promise.all([
      this.authRepository.findByUsername(dto.username),
      this.authRepository.findByEmail(dto.email),
      dto.phoneNumber
        ? this.authRepository.findByPhoneNumber(dto.phoneNumber)
        : Promise.resolve(null),
    ]);

    if (userByUsername) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_EXISTS('Username'));
    }

    if (userByEmail) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    if (userByPhone) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_EXISTS('Phone number'));
    }
  }

  private isUniqueConstraintViolation(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private buildDuplicateException(error: Prisma.PrismaClientKnownRequestError): ConflictException {
    const rawTarget = error.meta?.target;
    const fields = Array.isArray(rawTarget) ? rawTarget : rawTarget ? [rawTarget] : [];
    const field = fields.length > 0 && typeof fields[0] === 'string' ? fields[0] : '';

    if (field.includes('email')) {
      return new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
    if (field.includes('username')) {
      return new ConflictException(ERROR_MESSAGES.ALREADY_EXISTS('Username'));
    }
    return new ConflictException(ERROR_MESSAGES.ALREADY_EXISTS('Account'));
  }
}
