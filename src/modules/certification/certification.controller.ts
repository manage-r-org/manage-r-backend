import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CertificationService } from './certification.service';

/**
 * CertificationController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('Certification')
@Controller('certification')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}
}
