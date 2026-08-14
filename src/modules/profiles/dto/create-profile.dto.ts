import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating the authenticated user's profile.
 *
 * Every profile column is nullable in the schema, so all fields are optional.
 * Ownership (`user_id`) is deliberately NOT part of this DTO — it comes from
 * the verified JWT (`@CurrentUser().id`). The global `ValidationPipe`
 * (whitelist + forbidNonWhitelisted) rejects any undeclared property, so a
 * client cannot sneak in `userId`, `role`, or database-managed timestamps.
 */
export class CreateProfileDto {
  @ApiPropertyOptional({ example: 'Tasin', description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Shahriar', description: 'Middle name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ example: 'Chowdhury', description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '1995-01-01', description: 'Date of birth (ISO-8601)' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: 'Software Engineer', description: 'Professional headline' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiPropertyOptional({ example: 'Building things that matter.', description: 'Profile summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'tasin@example.com', description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '017XXXXXXXX', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://tasin.dev', description: 'Personal website' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/in/tasin',
    description: 'LinkedIn profile URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/tasin', description: 'GitHub profile URL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh', description: 'Present address' })
  @IsOptional()
  @IsString()
  presentAddress?: string;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh', description: 'Permanent address' })
  @IsOptional()
  @IsString()
  permanentAddress?: string;
}
