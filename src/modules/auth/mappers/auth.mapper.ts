import { sec_user } from '@prisma/client';

/**
 * API-safe shape of a newly registered user.
 *
 * Only safe fields are exposed: BIGINT ids are serialized as strings
 * (JSON.stringify cannot serialize JavaScript `bigint`) and no password,
 * password hash, or internal bookkeeping fields are ever returned.
 */
export interface RegisteredUserResponse {
  userId: string;
  username: string;
  email: string;
}

/**
 * API-safe shape returned by a successful login.
 *
 * Contains the signed JWTs and their metadata only — the password hash
 * and any internal database fields are never exposed.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * API-safe shape returned when a refresh token is exchanged for a new access
 * token.
 *
 * Manage-R refresh tokens are stateless (not persisted), so the endpoint does
 * not rotate them and therefore returns no new refresh token — the client
 * keeps reusing the same refresh token until it expires.
 */
export interface RefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * API-safe shape returned by a successful logout.
 *
 * Logout is client-side token disposal in the current architecture: refresh
 * tokens are stateless JWTs that are never persisted, so there is nothing to
 * revoke server-side. The endpoint confirms the authenticated user's logout,
 * logs the event, and returns no tokens or account data.
 */
export interface LogoutResponse {
  message: string;
  data: null;
}

/**
 * Maps a persisted `sec_user` (plus any relations) into the API-safe
 * registration response.
 */
export function toRegisteredUserResponse(user: sec_user): RegisteredUserResponse {
  return {
    userId: user.user_id.toString(),
    username: user.username,
    email: user.email,
  };
}
