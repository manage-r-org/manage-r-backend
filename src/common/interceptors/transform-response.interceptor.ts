import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Global response interceptor that wraps every successful response
 * into the standard API response envelope.
 *
 * Shape:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": { ... }
 * }
 *
 * Controllers can pass a custom message by returning:
 *   { message: 'Custom message', data: payload }
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // Allow controllers to provide a custom message
        if (
          response !== null &&
          typeof response === 'object' &&
          'message' in (response as object) &&
          'data' in (response as object)
        ) {
          const { message, data } = response as unknown as { message: string; data: T };
          return {
            success: true,
            message,
            data,
          };
        }

        return {
          success: true,
          message: 'Operation completed successfully.',
          data: response,
        };
      }),
    );
  }
}
