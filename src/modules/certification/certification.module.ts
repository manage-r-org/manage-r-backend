import { Module } from '@nestjs/common';
import { CertificationController } from './certification.controller';
import { CertificationService } from './certification.service';
import { CertificationRepository } from './certification.repository';

@Module({
  controllers: [CertificationController],
  providers: [CertificationService, CertificationRepository],
  exports: [CertificationService],
})
export class CertificationModule {}
