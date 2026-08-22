import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3HealthIndicator } from './s3.health';

@Module({
    imports: [TerminusModule, PrismaModule, RedisModule],
    controllers: [HealthController],
    providers: [PrismaHealthIndicator, RedisHealthIndicator, S3HealthIndicator],
})
export class HealthModule { }