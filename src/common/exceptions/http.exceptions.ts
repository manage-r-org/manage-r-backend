import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class NotFoundException extends AppException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.NOT_FOUND, errorCode);
  }
}

export class BadRequestException extends AppException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.BAD_REQUEST, errorCode);
  }
}

export class ConflictException extends AppException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.CONFLICT, errorCode);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.UNAUTHORIZED, errorCode);
  }
}

export class ForbiddenException extends AppException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.FORBIDDEN, errorCode);
  }
}

export class UnprocessableEntityException extends AppException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, errorCode);
  }
}
