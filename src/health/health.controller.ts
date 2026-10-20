import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<{ status: 'ok'; database: 'ok' }> {
    try {
      await this.healthService.checkDatabase();
      return { status: 'ok', database: 'ok' };
    } catch {
      this.logger.error('Database health check failed');
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'A required service is unavailable.',
      });
    }
  }
}
