import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResumeService } from './resume.service';

/**
 * ResumeController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('Resume')
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}
}
