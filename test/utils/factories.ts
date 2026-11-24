import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/auth/auth.service';

export const TEST_PASSWORD = 'Passw0rd!';

// Один хэш на весь прогон: argon2 дорогой, а пароль у всех фикстур одинаковый.
let passwordHashPromise: Promise<string> | undefined;
function testPasswordHash(): Promise<string> {
  passwordHashPromise ??= argon2.hash(TEST_PASSWORD);
  return passwordHashPromise;
}

export async function createUser(
  app: INestApplication,
  opts: { role?: Role; email?: string; username?: string } = {},
) {
  const suffix = randomUUID().slice(0, 8);

  return app.get(PrismaService).user.create({
    data: {
      email: opts.email ?? `user-${suffix}@example.com`,
      passwordHash: await testPasswordHash(),
      role: opts.role ?? Role.USER,
      profile: { create: { username: opts.username ?? `user_${suffix}` } },
    },
    include: { profile: true },
  });
}

/**
 * Логин через AuthService, а не через POST /auth/login.
 * На роуте стоит @Throttle(5/мин), а ThrottlerGuard ключует по IP:
 * все запросы supertest идут с одного адреса, после 5-го был бы 429.
 * Токены при этом настоящие — реальная подпись и реальная сессия в Redis.
 */
export async function loginAs(app: INestApplication, email: string) {
  return app.get(AuthService).login({ email, password: TEST_PASSWORD });
}

/**
 * Рецепт создаётся напрямую в БД, минуя RecipesService:
 * фикстуры не должны наследовать баги слагов, тегов и транзакций.
 */
export async function createRecipe(
  app: INestApplication,
  opts: { authorId: string; isPublished?: boolean; slug?: string; title?: string },
) {
  return app.get(PrismaService).recipe.create({
    data: {
      title: opts.title ?? 'Тестовый рецепт',
      slug: opts.slug ?? `test-${randomUUID().slice(0, 8)}`,
      cookTime: 30,
      isPublished: opts.isPublished ?? true,
      authorId: opts.authorId,
    },
  });
}