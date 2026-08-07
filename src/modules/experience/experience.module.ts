import { Module } from '@nestjs/common';
import { ExperienceController } from './experience.controller';
import { ExperienceService } from './experience.service';
import { ExperienceRepository } from './experience.repository';

@Module({
  controllers: [ExperienceController],
  providers: [ExperienceService, ExperienceRepository],
  exports: [ExperienceService],
})
export class ExperienceModule {}
