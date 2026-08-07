import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application exception.
 * All custom exceptions should extend this class.
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly errorCode?: string,
  ) {
    super({ message, statusCode, errorCode }, statusCode);
  }
}
