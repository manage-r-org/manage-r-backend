import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Application logs are emitted through nestjs-pino. Suppress Nest's verbose
    // route-registration output so startup remains concise.
    logger: false,
  });

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
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
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

  const logger = await app.resolve(PinoLogger);
  logger.setContext('Bootstrap');
  logger.info(
    {
      event: 'application_started',
      environment: config.nodeEnv,
      port: config.port,
      apiUrl: `http://localhost:${config.port}/${config.apiPrefix}/v${config.apiVersion}`,
      swaggerUrl: config.swaggerEnabled
        ? `http://localhost:${config.port}/${config.apiPrefix}/docs`
        : undefined,
      database: 'connected',
      nodeVersion: process.version,
      pid: process.pid,
      startedAt: new Date().toISOString(),
    },
    buildStartupSummary(config),
  );
}

function buildStartupSummary(config: AppConfigService): string {
  const apiUrl = `http://localhost:${config.port}/${config.apiPrefix}/v${config.apiVersion}`;
  const swaggerUrl = config.swaggerEnabled
    ? `http://localhost:${config.port}/${config.apiPrefix}/docs`
    : 'disabled';

  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🚀 Manage-R API Started',
    '',
    `Environment : ${config.nodeEnv}`,
    `Port        : ${config.port}`,
    `API         : ${apiUrl}`,
    `Swagger     : ${swaggerUrl}`,
    'Database    : Connected',
    `Node        : ${process.version}`,
    `PID         : ${process.pid}`,
    `Started At  : ${new Date().toISOString()}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
