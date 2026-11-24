import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RecipesViewService {
  private readonly logger = new Logger(RecipesViewService.name);
  private readonly HASH_KEY = 'recipe:views:pending';

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Асинхронный инкремент просмотра с защитой от накрутки (дедупликация на 1 час)
   */
  async incrementView(
    recipeId: string,
    clientIdentifier: string,
  ): Promise<void> {
    const dedupKey = `recipe:viewed:${recipeId}:${clientIdentifier}`;

    // Пытаемся установить ключ на 1 час только если его еще нет (NX)
    const isNewVisit = await this.redis.client.set(
      dedupKey,
      '1',
      'EX',
      3600,
      'NX',
    );

    if (isNewVisit) {
      // Инкрементируем накопленный счетчик в общем хэше
      await this.redis.client.hincrby(this.HASH_KEY, recipeId, 1);
    }
  }

  /**
   * Периодический сброс накопленных просмотров в PostgreSQL раз в 1 минуту
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async syncViewsToDatabase(): Promise<void> {
    // Атомарно забираем все накопленные дельты и очищаем Redis
    const pipeline = this.redis.client.pipeline();
    pipeline.hgetall(this.HASH_KEY);
    pipeline.del(this.HASH_KEY);

    const results = await pipeline.exec();
    if (!results || !results[0] || results[0][0]) {
      return;
    }

    const viewsData = results[0][1] as Record<string, string> | null;
    if (!viewsData || Object.keys(viewsData).length === 0) {
      return;
    }

    const updates = Object.entries(viewsData).map(([recipeId, countStr]) => {
      const views = parseInt(countStr, 10);
      return this.prisma.recipe.update({
        where: { id: recipeId },
        data: {
          viewsCount: {
            increment: views,
          },
        },
      });
    });

    try {
      await this.prisma.$transaction(updates);
      this.logger.log(
        `Синхронизированы просмотры для ${updates.length} рецептов`,
      );
    } catch (error) {
      this.logger.error('Ошибка при синхронизации просмотров в БД', error);
      // При ошибке возвращаем значения обратно в хэш
      for (const [recipeId, countStr] of Object.entries(viewsData)) {
        await this.redis.client.hincrby(
          this.HASH_KEY,
          recipeId,
          parseInt(countStr, 10),
        );
      }
    }
  }
}
