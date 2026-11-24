import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';

export async function resetState(app: INestApplication): Promise<void> {
  // Страховка от опечатки в env: не даём стереть dev-данные
  if (
    process.env.NODE_ENV !== 'test' ||
    !process.env.POSTGRES_DB?.endsWith('-test')
  ) {
    throw new Error('resetState разрешён только для тестового окружения');
  }

  const prisma = app.get(PrismaService);

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length > 0) {
    // test-only: идентификаторы из pg_tables, не из пользовательского ввода
    const list = tables.map((t) => `"${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
    );
  }

  // Безопасно: .env.test указывает на отдельный инстанс redis-test:6380
  await app.get(RedisService).client.flushdb();
}
