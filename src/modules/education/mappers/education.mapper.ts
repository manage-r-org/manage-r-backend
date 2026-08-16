import type { education } from '@prisma/client';

/**
 * API-safe shape returned by the education endpoints.
 *
 * One education entry belonging to the currently authenticated user's profile,
 * explicitly whitelisted. BIGINT ids are serialized as strings (JSON.stringify
 * cannot serialize JavaScript `bigint`). Only the entry's own user-facing
 * fields are exposed — no sec_user internals, no internal relation objects.
 */
export interface EducationResponse {
  educationId: string;
  profileId: string | null;
  degree: string | null;
  institution: string | null;
  fieldOfStudy: string | null;
  grade: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean | null;
  description: string | null;
}

/**
 * Maps a persisted `education` row into the API-safe education response.
 */
export function toEducationResponse(education: education): EducationResponse {
  return {
    educationId: education.education_id.toString(),
    profileId: education.profile_id ? education.profile_id.toString() : null,
    degree: education.degree,
    institution: education.institution,
    fieldOfStudy: education.field_of_study,
    grade: education.grade,
    startDate: education.start_date,
    endDate: education.end_date,
    isCurrent: education.is_current,
    description: education.description,
  };
}

/**
 * API-safe shape returned by a successful education deletion.
 *
 * The deleted row is never returned (no education data, no internal ids). The
 * standard response interceptor wraps `{ message, data: null }` into the usual
 * `{ success, message, data: null }` envelope — same convention as profile
 * delete and auth logout.
 */
export interface DeleteEducationResponse {
  message: string;
  data: null;
}
