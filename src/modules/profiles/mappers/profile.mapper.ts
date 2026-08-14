import type { profile } from '@prisma/client';

/**
 * API-safe shape returned by GET /profile.
 *
 * The profile of the currently authenticated user, explicitly whitelisted.
 * BIGINT ids are serialized as strings (JSON.stringify cannot serialize
 * JavaScript `bigint`). Only the profile's own user-facing fields are exposed;
 * no sec_user data (password hash, tokens) ever flows through this type.
 */
export interface ProfileResponse {
  profileId: string;
  userId: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dob: Date | null;
  headline: string | null;
  summary: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Maps a persisted `profile` row into the API-safe profile response.
 */
export function toProfileResponse(profile: profile): ProfileResponse {
  return {
    profileId: profile.profile_id.toString(),
    userId: profile.user_id.toString(),
    firstName: profile.first_name,
    middleName: profile.middle_name,
    lastName: profile.last_name,
    dob: profile.dob,
    headline: profile.headline,
    summary: profile.summary,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    linkedinUrl: profile.linkedin_url,
    githubUrl: profile.github_url,
    presentAddress: profile.present_address,
    permanentAddress: profile.permanent_address,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

/**
 * API-safe shape returned by a successful profile deletion.
 *
 * The deleted row is never returned (no profile data, no internal ids). The
 * standard response interceptor wraps `{ message, data: null }` into the
 * usual `{ success, message, data: null }` envelope — same convention as
 * auth logout.
 */
export interface DeleteProfileResponse {
  message: string;
  data: null;
}
