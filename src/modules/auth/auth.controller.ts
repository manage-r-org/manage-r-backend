import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
  RegisteredUserResponse,
} from './mappers/auth.mapper';
import { ApiStandardResponse, CurrentUser, Public } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { SUCCESS_MESSAGES } from '../../common/constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   *
   * Public endpoint. Creates a new account with the default USER role and an
   * empty profile, then returns only sanitized user information.
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiStandardResponse(HttpStatus.CREATED, SUCCESS_MESSAGES.CREATED('User'))
  register(@Body() dto: RegisterDto): Promise<RegisteredUserResponse> {
    return this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   *
   * Public endpoint. Verifies the identifier (username or email) and
   * password, then returns the signed access + refresh JWTs.
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in and receive access and refresh tokens' })
  @ApiStandardResponse(HttpStatus.OK, 'Login successful')
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  /**
   * POST /api/v1/auth/refresh
   *
   * Public endpoint. Exchanges a valid refresh token for a new access token.
   * Deliberately not protected by the access-token guard: it exists so the
   * client can get a new access token after the old one has expired.
   */
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiStandardResponse(HttpStatus.OK, 'Access token refreshed')
  refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResponse> {
    return this.authService.refresh(dto);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Protected endpoint. The global JwtAuthGuard verifies the access token and
   * @CurrentUser() supplies the identity; the client discards its tokens. No
   * body is accepted, so a client can never log out (or impersonate) another
   * account. Deliberately thin: no revocation logic lives here because refresh
   * tokens are stateless (see AuthService.logout).
   */
  @Post('logout')
  @ApiOperation({ summary: 'Log out the authenticated user' })
  @ApiStandardResponse(HttpStatus.OK, 'Logout successful')
  logout(@CurrentUser() user: IAuthenticatedUser): LogoutResponse {
    return this.authService.logout(user);
  }

  /**
   * GET /api/v1/auth/me
   *
   * Protected endpoint. The global JwtAuthGuard verifies the access token and
   * @CurrentUser() supplies the identity. No userId/email/username is accepted
   * from the request, so a client can only ever see its own account. Thin:
   * identity resolution and the safe mapping live in AuthService.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiStandardResponse(HttpStatus.OK, 'Current user retrieved successfully')
  me(@CurrentUser() user: IAuthenticatedUser): Promise<MeResponse> {
    return this.authService.getMe(user);
  }
}
