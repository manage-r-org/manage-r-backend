import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for exchanging a refresh token for a new access token.
 *
 * The client sends the refresh token it received at login. Only this field is
 * accepted — the global ValidationPipe rejects any extra property (e.g. a
 * client-supplied `userId`, `role`, `accessToken`, or `password`).
 *
 * Token validity is verified in AuthService, not here: an empty/missing value
 * is a 400, anything else that fails signature or expiry checks is a 401.
 */
export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'Refresh token issued at login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
