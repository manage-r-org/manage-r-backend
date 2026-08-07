import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a route parameter is a valid UUID v4 string.
 *
 * Usage:
 *   @Get(':id')
 *   findOne(@Param('id', ParseUuidPipe) id: string) { ... }
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException(`"${value}" is not a valid UUID.`);
    }
    return value;
  }
}
