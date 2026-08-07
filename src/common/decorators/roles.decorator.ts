import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Assigns required roles to a route handler or controller.
 *
 * Usage:
 *   @Roles(Role.ADMIN, Role.MANAGER)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('admin')
 *   adminRoute() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
