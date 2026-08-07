import { Role } from '../enums/role.enum';

/**
 * Represents the authenticated user payload attached to request.user
 * after JWT verification.
 */
export interface IAuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
}
