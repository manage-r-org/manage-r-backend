import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/**
 * Convenience decorator that attaches standard Swagger response docs.
 */
export function ApiStandardResponse(
  status: HttpStatus.OK | HttpStatus.CREATED = HttpStatus.OK,
  description = 'Success',
) {
  const responseDecorator =
    status === HttpStatus.CREATED
      ? ApiCreatedResponse({ description })
      : ApiOkResponse({ description });

  return applyDecorators(
    HttpCode(status),
    responseDecorator,
    ApiBadRequestResponse({ description: 'Bad request' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden' }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}
