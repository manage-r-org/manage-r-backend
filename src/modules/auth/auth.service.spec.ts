import { Prisma, sec_user } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { AuthRepository, UserWithRole } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/exceptions';
import { AppConfigService } from '../../config/app-config.service';
import { IAuthenticatedUser } from '../../common/interfaces';
import { Role } from '../../common/enums/role.enum';

jest.mock('../../common/utils/hash.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

import { comparePassword, hashPassword } from '../../common/utils/hash.util';

const mockUser = {
  user_id: 1n,
  username: 'tasin',
  email: 'tasin@example.com',
  phone_number: '017XXXXXXXX',
} as sec_user;

const mockUserWithRole = {
  ...mockUser,
  password_hash: '$2b$12$stored-password-hash',
  is_active: true,
  sec_role: { role_name: 'USER' },
} as unknown as UserWithRole;

function buildValidDto(): RegisterDto {
  const dto = new RegisterDto();
  dto.username = 'tasin';
  dto.email = 'tasin@example.com';
  dto.phoneNumber = '017XXXXXXXX';
  dto.password = 'StrongP@ss123';
  return dto;
}

function buildLoginDto(): LoginDto {
  const dto = new LoginDto();
  dto.identifier = 'tasin@example.com';
  dto.password = 'StrongP@ss123';
  return dto;
}

function buildRefreshDto(): RefreshTokenDto {
  const dto = new RefreshTokenDto();
  dto.refreshToken = 'valid-refresh-token';
  return dto;
}

describe('AuthService', () => {
  let service: AuthService;
  let repository: {
    findByUsername: jest.Mock;
    findByEmail: jest.Mock;
    findByPhoneNumber: jest.Mock;
    findByLoginIdentifier: jest.Mock;
    findByIdWithRole: jest.Mock;
    createUserWithProfile: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
    decode: jest.Mock;
  };
  const appConfig = {
    jwtRefreshSecret: 'test-refresh-secret',
    jwtRefreshExpiration: '7d',
  } as unknown as AppConfigService;
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    repository = {
      findByUsername: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByPhoneNumber: jest.fn().mockResolvedValue(null),
      findByLoginIdentifier: jest.fn().mockResolvedValue(null),
      findByIdWithRole: jest.fn().mockResolvedValue(null),
      createUserWithProfile: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    jest.mocked(hashPassword).mockReset();
    jest.mocked(hashPassword).mockResolvedValue('$2b$12$hashed-value-not-the-plain-text');
    jest.mocked(comparePassword).mockReset();

    service = new AuthService(
      repository as unknown as AuthRepository,
      logger as unknown as PinoLogger,
      jwtService as unknown as JwtService,
      appConfig,
    );
  });

  it('registers a new user and returns sanitized data', async () => {
    repository.createUserWithProfile.mockResolvedValue(mockUser);

    const result = await service.register(buildValidDto());

    expect(result).toEqual({
      userId: '1',
      username: 'tasin',
      email: 'tasin@example.com',
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password_hash');
  });

  it('hashes the password and never passes the plain text to the repository', async () => {
    repository.createUserWithProfile.mockResolvedValue(mockUser);

    await service.register(buildValidDto());

    expect(hashPassword).toHaveBeenCalledWith('StrongP@ss123');
    expect(repository.createUserWithProfile).toHaveBeenCalledWith({
      username: 'tasin',
      email: 'tasin@example.com',
      phoneNumber: '017XXXXXXXX',
      passwordHash: '$2b$12$hashed-value-not-the-plain-text',
    });
  });

  it('rejects a duplicate username', async () => {
    repository.findByUsername.mockResolvedValue(mockUser);

    await expect(service.register(buildValidDto())).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createUserWithProfile).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email', async () => {
    repository.findByEmail.mockResolvedValue(mockUser);

    await expect(service.register(buildValidDto())).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createUserWithProfile).not.toHaveBeenCalled();
  });

  it('rejects a duplicate phone number', async () => {
    repository.findByPhoneNumber.mockResolvedValue(mockUser);

    await expect(service.register(buildValidDto())).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createUserWithProfile).not.toHaveBeenCalled();
  });

  it('skips the phone-number duplicate check when no phone number is provided', async () => {
    const dto = buildValidDto();
    dto.phoneNumber = undefined;
    repository.createUserWithProfile.mockResolvedValue(mockUser);

    await service.register(dto);

    expect(repository.findByPhoneNumber).not.toHaveBeenCalled();
  });

  it('converts a Prisma unique-constraint error into a ConflictException', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: 'sec_user_email_key' },
    });
    repository.createUserWithProfile.mockRejectedValue(prismaError);

    await expect(service.register(buildValidDto())).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets unrelated database errors propagate', async () => {
    repository.createUserWithProfile.mockRejectedValue(new Error('connection refused'));

    await expect(service.register(buildValidDto())).rejects.toThrow('connection refused');
  });

  describe('login', () => {
    it('logs in with valid credentials and returns tokens', async () => {
      repository.findByLoginIdentifier.mockResolvedValue(mockUserWithRole);
      jest.mocked(comparePassword).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });

      const result = await service.login(buildLoginDto());

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toBe('signed-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBeGreaterThanOrEqual(899);
      expect(result.expiresIn).toBeLessThanOrEqual(900);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('looks the user up by username or email', async () => {
      repository.findByLoginIdentifier.mockResolvedValue(mockUserWithRole);
      jest.mocked(comparePassword).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });

      await service.login(buildLoginDto());

      expect(repository.findByLoginIdentifier).toHaveBeenCalledWith('tasin@example.com');
    });

    it('signs only the intended claims, never the password or hash', async () => {
      repository.findByLoginIdentifier.mockResolvedValue(mockUserWithRole);
      jest.mocked(comparePassword).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });

      await service.login(buildLoginDto());

      const expectedPayload = {
        sub: '1',
        email: 'tasin@example.com',
        roles: ['USER'],
      };
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, expectedPayload);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, expectedPayload, {
        secret: 'test-refresh-secret',
        expiresIn: '7d',
      });
      expect(expectedPayload).not.toHaveProperty('password');
      expect(expectedPayload).not.toHaveProperty('password_hash');
    });

    it('verifies the password against the stored hash', async () => {
      repository.findByLoginIdentifier.mockResolvedValue(mockUserWithRole);
      jest.mocked(comparePassword).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });

      await service.login(buildLoginDto());

      expect(comparePassword).toHaveBeenCalledWith('StrongP@ss123', '$2b$12$stored-password-hash');
    });

    it('rejects a wrong password with a generic unauthorized error', async () => {
      repository.findByLoginIdentifier.mockResolvedValue(mockUserWithRole);
      jest.mocked(comparePassword).mockResolvedValue(false);

      await expect(service.login(buildLoginDto())).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects an unknown identifier with the same generic error', async () => {
      repository.findByLoginIdentifier.mockResolvedValue(null);

      await expect(service.login(buildLoginDto())).rejects.toBeInstanceOf(UnauthorizedException);
      expect(comparePassword).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a disabled account', async () => {
      repository.findByLoginIdentifier.mockResolvedValue({
        ...mockUserWithRole,
        is_active: false,
      });
      jest.mocked(comparePassword).mockResolvedValue(true);

      await expect(service.login(buildLoginDto())).rejects.toBeInstanceOf(ForbiddenException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    function mockValidRefreshToken() {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        email: 'tasin@example.com',
        roles: ['USER'],
      });
      repository.findByIdWithRole.mockResolvedValue(mockUserWithRole);
      jwtService.signAsync.mockResolvedValueOnce('refreshed-access-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
    }

    it('exchanges a valid refresh token for a new access token', async () => {
      mockValidRefreshToken();

      const result = await service.refresh(buildRefreshDto());

      expect(result.accessToken).toBe('refreshed-access-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBeGreaterThanOrEqual(899);
      expect(result.expiresIn).toBeLessThanOrEqual(900);
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('verifies the refresh token against the refresh secret', async () => {
      mockValidRefreshToken();

      await service.refresh(buildRefreshDto());

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('loads the user by the sub claim and re-derives claims from the database', async () => {
      mockValidRefreshToken();

      await service.refresh(buildRefreshDto());

      expect(repository.findByIdWithRole).toHaveBeenCalledWith('1');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '1',
        email: 'tasin@example.com',
        roles: ['USER'],
      });
    });

    it('signs the access token with the module default expiration and never manufactures a refresh token', async () => {
      mockValidRefreshToken();

      await service.refresh(buildRefreshDto());

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '1',
        email: 'tasin@example.com',
        roles: ['USER'],
      });
    });

    it('rejects an expired refresh token', async () => {
      const expired = new Error('jwt expired');
      expired.name = 'TokenExpiredError';
      jwtService.verifyAsync.mockRejectedValue(expired);

      await expect(service.refresh(buildRefreshDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.findByIdWithRole).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a refresh token signed with the wrong secret', async () => {
      const invalid = new Error('invalid signature');
      invalid.name = 'JsonWebTokenError';
      jwtService.verifyAsync.mockRejectedValue(invalid);

      await expect(service.refresh(buildRefreshDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a malformed refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await expect(service.refresh(buildRefreshDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a token whose user no longer exists', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        email: 'tasin@example.com',
        roles: ['USER'],
      });
      repository.findByIdWithRole.mockResolvedValue(null);

      await expect(service.refresh(buildRefreshDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a disabled account', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        email: 'tasin@example.com',
        roles: ['USER'],
      });
      repository.findByIdWithRole.mockResolvedValue({
        ...mockUserWithRole,
        is_active: false,
      });

      await expect(service.refresh(buildRefreshDto())).rejects.toBeInstanceOf(ForbiddenException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('does not log the refresh token', async () => {
      mockValidRefreshToken();

      await service.refresh(buildRefreshDto());

      expect(logger.info).toHaveBeenCalledWith(
        { event: 'access_token_refreshed', userId: '1' },
        'Access token refreshed',
      );
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('valid-refresh-token'));
    });

    it('logs only a reason when a token is rejected, never the token itself', async () => {
      const invalid = new Error('invalid signature');
      invalid.name = 'JsonWebTokenError';
      jwtService.verifyAsync.mockRejectedValue(invalid);

      await expect(service.refresh(buildRefreshDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        { event: 'refresh_token_rejected', reason: 'JsonWebTokenError' },
        'Refresh token rejected',
      );
    });
  });

  describe('logout', () => {
    const authenticatedUser: IAuthenticatedUser = {
      id: '1',
      email: 'tasin@example.com',
      roles: [Role.USER],
    };

    it('returns success without any tokens, passwords, or hashes', () => {
      const result = service.logout(authenticatedUser);

      expect(result.message).toBe('Logout successful.');
      expect(result.data).toBeNull();
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('tokenType');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('derives the identity from the authenticated user, never client input', () => {
      service.logout(authenticatedUser);

      expect(logger.info).toHaveBeenCalledWith(
        { event: 'user_logged_out', userId: '1' },
        'User logged out',
      );
    });

    it('is safe to call more than once (idempotent)', () => {
      service.logout(authenticatedUser);

      expect(service.logout(authenticatedUser)).toEqual({
        message: 'Logout successful.',
        data: null,
      });
    });

    it('never logs the tokens', () => {
      service.logout(authenticatedUser);

      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('eyJhbGciOiJIUzI1NiIs'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('signed-access-token'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('valid-refresh-token'));
    });
  });

  describe('getMe', () => {
    const authenticatedUser: IAuthenticatedUser = {
      id: '1',
      email: 'tasin@example.com',
      roles: [Role.USER],
    };

    it('returns the safe account info for the authenticated user', async () => {
      repository.findByIdWithRole.mockResolvedValue(mockUserWithRole);

      const result = await service.getMe(authenticatedUser);

      expect(result).toEqual({
        userId: '1',
        username: 'tasin',
        email: 'tasin@example.com',
        phoneNumber: '017XXXXXXXX',
        role: 'USER',
      });
    });

    it('looks up the account by the authenticated user id only', async () => {
      repository.findByIdWithRole.mockResolvedValue(mockUserWithRole);

      await service.getMe(authenticatedUser);

      expect(repository.findByIdWithRole).toHaveBeenCalledWith('1');
    });

    it('returns the current role from the database, not from client input', async () => {
      repository.findByIdWithRole.mockResolvedValue({
        ...mockUserWithRole,
        sec_role: { role_name: 'ADMIN' },
      });

      const result = await service.getMe(authenticatedUser);

      expect(result.role).toBe('ADMIN');
    });

    it('never exposes the password hash or any token', async () => {
      repository.findByIdWithRole.mockResolvedValue(mockUserWithRole);

      const result = await service.getMe(authenticatedUser);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('tokenType');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('roleId');
    });

    it('throws NotFoundException when the account no longer exists', async () => {
      repository.findByIdWithRole.mockResolvedValue(null);

      await expect(service.getMe(authenticatedUser)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a disabled account like login and refresh', async () => {
      repository.findByIdWithRole.mockResolvedValue({
        ...mockUserWithRole,
        is_active: false,
      });

      await expect(service.getMe(authenticatedUser)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
