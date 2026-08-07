import { Module } from '@nestjs/common';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { JobApplicationRepository } from './job-application.repository';

@Module({
  controllers: [JobApplicationController],
  providers: [JobApplicationService, JobApplicationRepository],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}
