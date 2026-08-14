import { CreateProfileDto } from './create-profile.dto';

/**
 * DTO for updating the authenticated user's profile (PATCH semantics).
 *
 * Extends CreateProfileDto: the updateable fields are identical and every one
 * is optional, so the client sends only the fields it wants to change. An empty
 * body (no field supplied) is rejected by ProfilesService with 400 rather than
 * performing a meaningless update.
 *
 * Ownership (`user_id`) is deliberately NOT part of this DTO — it comes from
 * the verified JWT. The global `ValidationPipe` (whitelist + forbidNonWhitelisted)
 * rejects any undeclared property, so a client cannot redirect the update to
 * another account.
 */
export class UpdateProfileDto extends CreateProfileDto {}
