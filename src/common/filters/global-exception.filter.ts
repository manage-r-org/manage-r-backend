import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../../config/app-config.service';
import { getRequestId } from '../utils/http-log.util';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errorCode?: string;
}

/**
 * Global exception filter that standardises all error responses.
 *
 * Every error response shape:
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "message": "...",
 *   "timestamp": "...",
 *   "path": "..."
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred. Please try again later.';
    let errorCode: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (Array.isArray(responseObj['message'])
            ? (responseObj['message'] as string[]).join(', ')
            : (responseObj['message'] as string)) ?? message;
        errorCode = responseObj['errorCode'] as string | undefined;
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errorCode && { errorCode }),
    };

    const logDetails = {
      requestId: getRequestId(request),
      method: request.method,
      path: request.path,
      statusCode,
      exception: exception instanceof Error ? exception.name : 'UnknownException',
      message,
      ...(errorCode && { errorCode }),
      ...(request.user && { userId: (request.user as { id?: string }).id }),
      ...(this.config.isDevelopment && exception instanceof Error && { err: exception }),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logDetails, 'Unhandled exception');
    } else {
      this.logger.warn(logDetails, 'HTTP exception');
    }

    response.status(statusCode).json(errorResponse);
  }
}
