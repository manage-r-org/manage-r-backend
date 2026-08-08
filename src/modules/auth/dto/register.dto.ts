import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators';

/**
 * DTO for registering a new user account.
 *
 * The client can never supply privileged fields such as `role`, `userId`,
 * or timestamps — the global `ValidationPipe` (whitelist + forbidNonWhitelisted)
 * rejects any property not declared here.
 */
export class RegisterDto {
  @ApiProperty({ example: 'tasin', description: 'Unique account username' })
  @IsString()
  @Length(3, 100)
  username!: string;

  @ApiProperty({ example: 'tasin@example.com', description: 'Account email address' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '017XXXXXXXX', description: 'Optional contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiProperty({ example: 'StrongP@ss123', description: 'Account password' })
  @IsString()
  @IsStrongPassword()
  password!: string;
}
