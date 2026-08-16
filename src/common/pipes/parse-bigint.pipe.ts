import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const BIGINT_REGEX = /^\d{1,19}$/;

/**
 * Validates that a route parameter is a valid BIGINT id string.
 *
 * BIGINT ids exceed JavaScript's safe-integer range, so the value stays a
 * string (conversion to `BigInt` happens in the repository). Anything else —
 * a negative number, a float, non-numeric text, or an over-long value — is
 * rejected with 400 before it ever reaches the database.
 *
 * Usage:
 *   @Patch(':educationId')
 *   update(@Param('educationId', ParseBigIntPipe) educationId: string) { ... }
 */
@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!BIGINT_REGEX.test(value)) {
      throw new BadRequestException(`"${value}" is not a valid id.`);
    }
    return value;
  }
}
