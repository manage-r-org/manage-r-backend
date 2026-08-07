import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../../config/app-config.service';

const SLOW_QUERY_THRESHOLD_MS = 500;

type PrismaEventLogDefinitions = [
  { emit: 'event'; level: 'query' },
  { emit: 'event'; level: 'warn' },
  { emit: 'event'; level: 'error' },
];

type PrismaEventClientOptions = Prisma.PrismaClientOptions & {
  log: PrismaEventLogDefinitions;
};

const PRISMA_EVENT_LOGS: PrismaEventLogDefinitions = [
  { emit: 'event', level: 'query' },
  { emit: 'event', level: 'warn' },
  { emit: 'event', level: 'error' },
];

/**
 * PrismaService wraps PrismaClient as a singleton NestJS provider.
 *
 * - Connects on module init, disconnects on module destroy.
 * - Logs connection lifecycle, query errors, and slow queries through Pino.
 * - All repository classes must inject this service instead of
 *   instantiating PrismaClient directly.
 */
@Injectable()
export class PrismaService
  extends PrismaClient<PrismaEventClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    super({
      datasources: {
        db: { url: appConfig.databaseUrl },
      },
      log: PRISMA_EVENT_LOGS,
    });

    this.logger.setContext(PrismaService.name);
    this.registerQueryLogging();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.info({ event: 'database_connected' }, 'Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.info({ event: 'database_disconnected' }, 'Database connection closed');
    } catch (error: unknown) {
      this.logger.error(
        {
          event: 'database_disconnect_failed',
          exception: error instanceof Error ? error.name : 'UnknownException',
          ...(this.appConfig.isDevelopment && error instanceof Error && { err: error }),
        },
        'Database disconnect failed',
      );
      throw error;
    }
  }

  private registerQueryLogging(): void {
    this.$on('query', (event) => {
      if (event.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          {
            event: 'prisma_slow_query',
            duration: event.duration,
            target: event.target,
          },
          'Slow database query',
        );
      }
    });

    this.$on('warn', (event) => {
      this.logger.warn({ event: 'prisma_warning', target: event.target }, 'Prisma warning');
    });

    this.$on('error', (event) => {
      this.logger.error(
        { event: 'prisma_query_error', target: event.target },
        'Prisma query error',
      );
    });
  }
}
