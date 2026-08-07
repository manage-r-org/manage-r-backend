import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JobApplicationService } from './job-application.service';

/**
 * JobApplicationController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('JobApplication')
@Controller('job-application')
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}
}
