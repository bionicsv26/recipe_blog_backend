import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) { }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const ping = await this.redisService.client.ping();
      const isOk = ping === 'PONG';

      if (isOk) {
        return indicator.up();
      }
      throw indicator.down({ message: `Unexpected ping response: ${ping}` });
    } catch (error) {
      if ((error as Record<string, unknown>)?.[key]) {
        throw error;
      }
      throw indicator.down({ message: (error as Error).message });
    }
  }
}