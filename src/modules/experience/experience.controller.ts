import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExperienceService } from './experience.service';

/**
 * ExperienceController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('Experience')
@Controller('experience')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}
}
