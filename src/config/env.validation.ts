import * as Joi from 'joi';

/**
 * Joi validation schema for all environment variables.
 *
 * Validates at startup — the application will not start if any
 * required variables are missing or have invalid values.
 */
export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('1'),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Throttle / Rate Limiting
  THROTTLE_TTL: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),

  // Swagger
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_TITLE: Joi.string().default('Manage-R API'),
  SWAGGER_DESCRIPTION: Joi.string().default('Resume management and career tracking platform API'),
  SWAGGER_VERSION: Joi.string().default('1.0'),
});
