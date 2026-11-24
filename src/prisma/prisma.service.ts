import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Соединение с базой данных установлено');
  }

  async onModuleDestroy() {
    this.logger.log(
      '🛑 Получен сигнал завершения. Закрываем соединения с БД...',
    );
    await this.$disconnect();
    this.logger.log('✅ Соединения с базой данных корректно закрыты');
  }
}
