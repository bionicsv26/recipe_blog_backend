import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { resetState } from './utils/reset';
import { createUser, createRecipe, loginAs } from './utils/factories';
import { RedisService } from '../src/redis/redis.service';

describe('Фабрики и auth-хелпер', () => {
  let app: INestApplication;

  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => { await resetState(app); });

  it('createUser + loginAs дают рабочий access-токен', async () => {
    const user = await createUser(app, { role: Role.CHEF });
    const { accessToken } = await loginAs(app, user.email);

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(user.id);
    expect(res.body.role).toBe(Role.CHEF);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('loginAs создаёт настоящую сессию в Redis', async () => {
    const user = await createUser(app);
    const { refreshToken } = await loginAs(app, user.email);

    const { jti } = app.get(JwtService).decode(refreshToken) as { jti: string };
    const keys = await app.get(RedisService).client.keys(`refresh_token:${user.id}:*`);

    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain(jti);
  });

  it('createRecipe создаёт опубликованный рецепт, видимый анониму', async () => {
    const chef = await createUser(app, { role: Role.CHEF });
    const recipe = await createRecipe(app, { authorId: chef.id });

    const res = await request(app.getHttpServer())
      .get(`/recipes/${recipe.slug}`)
      .expect(200);

    expect(res.body.id).toBe(recipe.id);
  });

  it('фабрики дают уникальные email и username', async () => {
    const a = await createUser(app);
    const b = await createUser(app);

    expect(a.email).not.toBe(b.email);
    expect(a.profile!.username).not.toBe(b.profile!.username);
  });
});