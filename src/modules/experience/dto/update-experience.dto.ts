import { PartialType } from '@nestjs/swagger';
import { CreateExperienceDto } from './create-experience.dto';

/**
 * DTO for updating one of the authenticated user's work-experience entries.
 *
 * Extends the create DTO, so the same optional fields and validation rules
 * apply. PATCH semantics: only the supplied fields change (an `undefined`
 * field is ignored by Prisma); an explicit `null` clears the field. Ownership
 * is resolved from the verified JWT + the `:experienceId` path param — never
 * from the body — and the global `ValidationPipe` rejects any undeclared
 * property (e.g. a smuggled `profileId`/`userId`).
 */
export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {}
