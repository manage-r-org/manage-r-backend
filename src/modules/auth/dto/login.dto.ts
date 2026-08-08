import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators';

/**
 * DTO for logging in with an existing account.
 *
 * `identifier` accepts either the account username or email address.
 * Only these two fields are accepted — the global ValidationPipe rejects
 * any extra property (e.g. a client-supplied `role`).
 */
export class LoginDto {
  @ApiProperty({
    example: 'tasin@example.com',
    description: 'Registered username or email address',
  })
  @IsString()
  @Length(3, 255)
  identifier!: string;

  @ApiProperty({ example: 'StrongP@ss123', description: 'Account password' })
  @IsString()
  @IsStrongPassword()
  password!: string;
}
