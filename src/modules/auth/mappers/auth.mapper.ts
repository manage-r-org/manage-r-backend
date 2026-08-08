import type { sec_user } from '@prisma/client';
import type { UserWithRole } from '../auth.repository';

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
 * API-safe shape returned by GET /auth/me.
 *
 * Identity of the currently authenticated account. The role is read from the
 * database (current truth), not from the JWT. The password hash, token values,
 * and all internal security fields are never exposed.
 */
export interface MeResponse {
  userId: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  role: string;
}

/**
 * Maps a persisted `sec_user` (with its role relation) into the API-safe
 * `/auth/me` response.
 */
export function toMeResponse(account: UserWithRole): MeResponse {
  return {
    userId: account.user_id.toString(),
    username: account.username,
    email: account.email,
    phoneNumber: account.phone_number,
    role: account.sec_role.role_name,
  };
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
