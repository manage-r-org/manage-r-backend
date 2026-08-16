import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for adding a work-experience entry to the authenticated user's profile.
 *
 * Every experience column is nullable in the schema (except the identity and the
 * `profile_id` owner), so all fields are optional. Ownership is deliberately NOT
 * part of this DTO — the entry is attached to the profile resolved from the
 * verified JWT (`@CurrentUser().id`). There is no `experienceId`, `profileId`,
 * or `userId` field, and the global `ValidationPipe` (whitelist +
 * forbidNonWhitelisted) rejects any undeclared property.
 */
export class CreateExperienceDto {
  @ApiPropertyOptional({ example: 'Google', description: 'Company / employer name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer', description: 'Job title / position' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  @ApiPropertyOptional({ example: 'Full-time', description: 'Employment type (e.g. Full-time)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  employmentType?: string;

  @ApiPropertyOptional({ example: 'Mountain View, CA', description: 'Work location' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: '2019-05-01', description: 'Start date (ISO-8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-02-28', description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: true, description: 'Currently employed at this company' })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 'Led a team of five...', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}
