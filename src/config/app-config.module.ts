import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { AppConfigService } from './app-config.service';

/**
 * Global configuration module.
 *
 * Loads and validates all environment variables at startup via Joi.
 * Exports AppConfigService so any module can inject it without
 * re-importing this module.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // report all validation errors, not just the first
        // Nest validates the complete process environment, which also contains
        // operating system, shell, editor, and npm variables outside this schema.
        // Known application variables remain validated by envValidationSchema.
        allowUnknown: true,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
