import type { experience } from '@prisma/client';

/**
 * API-safe shape returned by the experience endpoints.
 *
 * One work-experience entry belonging to the currently authenticated user's
 * profile, explicitly whitelisted. BIGINT ids are serialized as strings
 * (JSON.stringify cannot serialize JavaScript `bigint`). Only the entry's own
 * user-facing fields are exposed — no sec_user internals, no internal relation
 * objects. The `experience` table has no `created_at`/`updated_at` columns, so
 * no timestamps are exposed.
 */
export interface ExperienceResponse {
  experienceId: string;
  profileId: string | null;
  companyName: string | null;
  position: string | null;
  employmentType: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean | null;
  description: string | null;
}

/**
 * Maps a persisted `experience` row into the API-safe experience response.
 */
export function toExperienceResponse(experience: experience): ExperienceResponse {
  return {
    experienceId: experience.experience_id.toString(),
    profileId: experience.profile_id ? experience.profile_id.toString() : null,
    companyName: experience.company_name,
    position: experience.position,
    employmentType: experience.employment_type,
    location: experience.location,
    startDate: experience.start_date,
    endDate: experience.end_date,
    isCurrent: experience.is_current,
    description: experience.description,
  };
}

/**
 * API-safe shape returned by a successful experience deletion.
 *
 * The deleted row is never returned (no experience data, no internal ids). The
 * standard response interceptor wraps `{ message, data: null }` into the usual
 * `{ success, message, data: null }` envelope — same convention as education
 * delete, profile delete, and auth logout.
 */
export interface DeleteExperienceResponse {
  message: string;
  data: null;
}
