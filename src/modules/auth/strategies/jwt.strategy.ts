import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/app-config.service';
import { IAuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { Role } from '../../../common/enums/role.enum';

interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
}

/**
 * JWT Access Token Strategy.
 *
 * Validates incoming bearer tokens and attaches the decoded user
 * payload to request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(appConfig: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwtAccessSecret,
    });
  }

  validate(payload: JwtPayload): IAuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
