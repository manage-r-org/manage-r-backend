import { PartialType } from '@nestjs/swagger';
import { CreateEducationDto } from './create-education.dto';

/**
 * DTO for updating one of the authenticated user's education entries.
 *
 * Extends the create DTO, so the same optional fields and validation rules
 * apply. PATCH semantics: only the supplied fields change (an `undefined`
 * field is ignored by Prisma); an explicit `null` clears the field. Ownership
 * is resolved from the verified JWT + the `:educationId` path param — never
 * from the body — and the global `ValidationPipe` rejects any undeclared
 * property (e.g. a smuggled `profileId`/`userId`).
 */
export class UpdateEducationDto extends PartialType(CreateEducationDto) {}
