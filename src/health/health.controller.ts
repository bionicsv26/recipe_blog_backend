import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly memoryHealth: MemoryHealthIndicator,
  ) { }

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Проверка доступности ключевых сервисов (PostgreSQL, Redis, Memory)' })
  @ApiOkResponse({ description: 'Все службы функционируют нормально' })
  @ApiServiceUnavailableResponse({ description: 'Один или несколько сервисов недоступны' })
  async check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      // Проверка утечек памяти (предупреждение при потреблении heap > 300MB)
      () => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}