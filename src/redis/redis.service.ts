import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis; // переименовали для внутреннего использования
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.redisClient = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: false,
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  /**
   * Публичный геттер для прямого доступа к экземпляру Redis через `this.redis.client`
   */
  get client(): Redis {
    return this.redisClient;
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  // --- Методы для Refresh Token & Sessions ---

  /**
   * Сохраняет tokenId для пользователя с временем жизни TTL (в секундах)
   * Формат ключа: refresh_token:<userId>:<tokenId>
   */
  async saveRefreshToken(
    userId: string,
    tokenId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    await this.redisClient.set(key, 'valid', 'EX', ttlSeconds);
  }

  /**
   * Проверяет, валиден ли данный tokenId
   */
  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    const key = `refresh_token:${userId}:${tokenId}`;
    const result = await this.redisClient.get(key);
    return result === 'valid';
  }

  /**
   * Инвалидирует конкретную сессию (например, при логауте)
   */
  async invalidateRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    await this.redisClient.del(key);
  }

  /**
   * Инвалидирует все активные сессии пользователя (например, при смене пароля)
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  /**
   * Прямой доступ к экземпляру ioredis для обратной совместимости
   */
  getClient(): Redis {
    return this.redisClient;
  }

  // Сохранение токена сброса (TTL обычно 15 минут / 900 сек)
  async savePasswordResetToken(
    userId: string,
    token: string,
    ttlSeconds = 900,
  ): Promise<void> {
    const key = `password_reset:${token}`;
    await this.redisClient.set(key, userId, 'EX', ttlSeconds);
  }

  // Получение userId по токену сброса
  async getUserIdByPasswordResetToken(token: string): Promise<string | null> {
    const key = `password_reset:${token}`;
    return this.redisClient.get(key);
  }

  // Удаление токена после успешного сброса
  async invalidatePasswordResetToken(token: string): Promise<void> {
    const key = `password_reset:${token}`;
    await this.redisClient.del(key);
  }
}
