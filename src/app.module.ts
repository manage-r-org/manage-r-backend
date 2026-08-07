import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import {
  createRequestId,
  formatHttpLogMessage,
  getHttpLogDetails,
  getHttpLogLevel,
  getRequestElapsedTime,
  isNoisyRoute,
} from './common/utils/http-log.util';

// Feature Modules
import { RootModule } from './modules/root/root.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RolesModule } from './modules/roles/roles.module';
import { ResumeModule } from './modules/resume/resume.module';
import { EducationModule } from './modules/education/education.module';
import { ExperienceModule } from './modules/experience/experience.module';
import { ProjectModule } from './modules/project/project.module';
import { CertificationModule } from './modules/certification/certification.module';
import { JobApplicationModule } from './modules/job-application/job-application.module';

@Module({
  imports: [
    // ── Core / Infrastructure ─────────────────────────────────────────────────
    AppConfigModule,
    PrismaModule,

    // ── Structured Logging (pino) ─────────────────────────────────────────────
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.isDevelopment ? 'debug' : 'info',
          transport: config.isDevelopment
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  messageFormat: '{msg}',
                  ignore:
                    'pid,hostname,requestId,method,path,statusCode,responseTime,ip,userId,event,context',
                },
              }
            : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers.x-api-key',
              'req.body.password',
              'req.body.refreshToken',
              'req.body.accessToken',
              'req.body.token',
            ],
            censor: '[REDACTED]',
          },
          autoLogging: {
            ignore: isNoisyRoute,
          },
          quietReqLogger: true,
          quietResLogger: true,
          customAttributeKeys: {
            reqId: 'requestId',
          },
          genReqId: createRequestId,
          customLogLevel: getHttpLogLevel,
          customSuccessObject: (request, response, { responseTime }: { responseTime: number }) =>
            getHttpLogDetails(request, response, responseTime),
          customSuccessMessage: formatHttpLogMessage,
          customErrorObject: (
            request,
            response,
            error,
            { responseTime }: { responseTime: number },
          ) => ({
            ...getHttpLogDetails(request, response, responseTime),
            exception: error.name,
            ...(config.isDevelopment && { err: error }),
          }),
          customErrorMessage: (request, response) =>
            formatHttpLogMessage(request, response, getRequestElapsedTime(request)),
        },
      }),
    }),

    // ── Feature Modules ───────────────────────────────────────────────────────
    RootModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    RolesModule,
    ResumeModule,
    EducationModule,
    ExperienceModule,
    ProjectModule,
    CertificationModule,
    JobApplicationModule,
  ],
  providers: [
    // Global exception filter — converts all errors to standard error envelope
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global response interceptor — wraps all success responses in standard envelope
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    // Global JWT guard — all routes protected by default; use @Public() to opt out
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard — enforces @Roles() decorator
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
