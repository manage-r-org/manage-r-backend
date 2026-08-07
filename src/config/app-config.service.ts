import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Application configuration service wrapper.
 * Centralises access to all app-level environment variables.
 * No service should call process.env directly.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.getOrThrow<string>('NODE_ENV');
  }

  get port(): number {
    return this.config.getOrThrow<number>('PORT');
  }

  get apiPrefix(): string {
    return this.config.getOrThrow<string>('API_PREFIX');
  }

  get apiVersion(): string {
    return this.config.getOrThrow<string>('API_VERSION');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // ── Database ────────────────────────────────────────────────────────────────

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  // ── JWT ─────────────────────────────────────────────────────────────────────

  get jwtAccessSecret(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  get jwtAccessExpiration(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_EXPIRATION');
  }

  get jwtRefreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtRefreshExpiration(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_EXPIRATION');
  }

  // ── CORS ────────────────────────────────────────────────────────────────────

  get corsOrigins(): string[] {
    const origins = this.config.getOrThrow<string>('CORS_ORIGINS');
    return origins.split(',').map((origin) => origin.trim());
  }

  // ── Throttle ────────────────────────────────────────────────────────────────

  get throttleTtl(): number {
    return this.config.getOrThrow<number>('THROTTLE_TTL');
  }

  get throttleLimit(): number {
    return this.config.getOrThrow<number>('THROTTLE_LIMIT');
  }

  // ── Swagger ─────────────────────────────────────────────────────────────────

  get swaggerEnabled(): boolean {
    return this.config.getOrThrow<boolean>('SWAGGER_ENABLED');
  }

  get swaggerTitle(): string {
    return this.config.getOrThrow<string>('SWAGGER_TITLE');
  }

  get swaggerDescription(): string {
    return this.config.getOrThrow<string>('SWAGGER_DESCRIPTION');
  }

  get swaggerVersion(): string {
    return this.config.getOrThrow<string>('SWAGGER_VERSION');
  }
}
