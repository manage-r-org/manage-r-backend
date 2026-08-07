import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IAuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Extracts the authenticated user from the request object.
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: IAuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof IAuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: IAuthenticatedUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
