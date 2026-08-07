import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectService } from './project.service';

/**
 * ProjectController — placeholder.
 * Add versioned route handlers here.
 */
@ApiTags('Project')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}
}
