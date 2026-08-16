import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for adding an education entry to the authenticated user's profile.
 *
 * Every education column is nullable in the schema, so all fields are optional.
 * Ownership is deliberately NOT part of this DTO — the entry is attached to the
 * profile resolved from the verified JWT (`@CurrentUser().id`). There is no
 * `educationId`, `profileId`, or `userId` field, and the global `ValidationPipe`
 * (whitelist + forbidNonWhitelisted) rejects any undeclared property.
 */
export class CreateEducationDto {
  @ApiPropertyOptional({ example: 'Bachelor of Science', description: 'Degree name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  degree?: string;

  @ApiPropertyOptional({ example: 'University of Dhaka', description: 'Institution name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  institution?: string;

  @ApiPropertyOptional({ example: 'Computer Science', description: 'Field of study' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: '3.82', description: 'Grade / GPA' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @ApiPropertyOptional({ example: '2020-01-15', description: 'Start date (ISO-8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-06-30', description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: true, description: 'Currently studying at this institution' })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 'Focused on distributed systems.', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}
