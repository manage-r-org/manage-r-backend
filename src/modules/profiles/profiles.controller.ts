import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';

/**
 * ProfilesController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}
}
