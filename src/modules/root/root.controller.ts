import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RootApiMetadata, RootService } from './root.service';

@ApiTags('Root')
@Controller()
export class RootController {
  constructor(private readonly rootService: RootService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retrieve API metadata and runtime status' })
  @ApiOkResponse({
    description: 'API metadata retrieved successfully.',
  })
  getMetadata(): RootApiMetadata {
    return this.rootService.getMetadata();
  }
}
