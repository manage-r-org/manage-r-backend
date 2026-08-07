import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

export interface RootApiMetadata {
  applicationName: string;
  description: string;
  version: string;
  apiVersion: string;
  environment: string;
  status: 'healthy';
  uptime: number;
  timestamp: string;
  nodeVersion: string;
  documentation: string;
}

/**
 * Provides public API metadata for clients, operational tooling, and discovery.
 */
@Injectable()
export class RootService {
  constructor(private readonly config: AppConfigService) {}

  getMetadata(): RootApiMetadata {
    return {
      applicationName: this.config.swaggerTitle,
      description: this.config.swaggerDescription,
      version: this.config.swaggerVersion,
      apiVersion: `v${this.config.apiVersion}`,
      environment: this.config.nodeEnv,
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      documentation: `/${this.config.apiPrefix}/docs`,
    };
  }
}
