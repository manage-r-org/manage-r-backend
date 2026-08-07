import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Defer logger until pino is ready
    bufferLogs: true,
  });

  // ── Pino Logger ─────────────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  const config = app.get(AppConfigService);

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: config.isProduction,
    }),
  );

  // ── Compression ─────────────────────────────────────────────────────────────
  app.use(compression());

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // ── Global Prefix & URI Versioning ──────────────────────────────────────────
  app.setGlobalPrefix(config.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: config.apiVersion });

  // ── Global Validation Pipe ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger / OpenAPI ───────────────────────────────────────────────────────
  if (config.swaggerEnabled) {
    const reflector = app.get(Reflector);
    void reflector; // ensure reflector is resolved (used by swagger internally)

    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.swaggerTitle)
      .setDescription(config.swaggerDescription)
      .setVersion(config.swaggerVersion)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addTag('Health', 'Application health checks')
      .addTag('Auth', 'Authentication and token management')
      .addTag('Users', 'User account management')
      .addTag('Profiles', 'User profile management')
      .addTag('Roles', 'Role and permission management')
      .addTag('Resume', 'Resume management')
      .addTag('Education', 'Education history')
      .addTag('Experience', 'Work experience')
      .addTag('Project', 'Projects')
      .addTag('Certification', 'Certifications and credentials')
      .addTag('JobApplication', 'Job application tracking')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // ── Graceful Shutdown ───────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start ────────────────────────────────────────────────────────────────────
  await app.listen(config.port);

  const logger = app.get(Logger);
  logger.log(
    `🚀 Manage-R API running on: http://localhost:${config.port}/${config.apiPrefix}/v${config.apiVersion}`,
  );

  if (config.swaggerEnabled) {
    logger.log(`📚 Swagger docs: http://localhost:${config.port}/${config.apiPrefix}/docs`);
  }
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
