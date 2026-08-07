import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EducationService } from './education.service';

/**
 * EducationController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('Education')
@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}
}
