import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

/**
 * HTTP Request/Response logger middleware.
 *
 * Note: With nestjs-pino, HTTP logging is typically handled by pino-http automatically.
 * This middleware is available for additional custom logging needs.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggerMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - startTime;

      this.logger.info(
        {
          method,
          url: originalUrl,
          statusCode,
          contentLength,
          responseTime: `${responseTime}ms`,
          userAgent,
          ip,
        },
        `${method} ${originalUrl} ${statusCode}`,
      );
    });

    next();
  }
}
