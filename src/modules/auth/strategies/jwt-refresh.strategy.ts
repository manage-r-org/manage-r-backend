import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AppConfigService } from '../../../config/app-config.service';
import { IAuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { Role } from '../../../common/enums/role.enum';

interface JwtRefreshPayload {
  sub: string;
  email: string;
  roles: Role[];
}

/**
 * JWT Refresh Token Strategy.
 *
 * Reads the refresh token from the Authorization header and validates
 * it using the refresh secret.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(appConfig: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  validate(_req: Request, payload: JwtRefreshPayload): IAuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
