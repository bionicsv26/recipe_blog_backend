import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { resetState } from './utils/reset';
import { createUser, createRecipe, loginAs } from './utils/factories';

describe('REC-01 · доступ автора к своему черновику', () => {
  let app: INestApplication;

  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => { await resetState(app); });

  // ОЖИДАЕТСЯ ПАДАЮЩИМ до PR8.
  // @Public() + глобальный JwtAuthGuard → req.user не заполняется → 404.
  // После фикса it.failing начнёт ПАДАТЬ — переключить на it.
  it.failing('автор открывает свой черновик по slug → 200', async () => {
    const chef = await createUser(app, { role: Role.CHEF });
    const { accessToken } = await loginAs(app, chef.email);
    const draft = await createRecipe(app, { authorId: chef.id, isPublished: false });

    const res = await request(app.getHttpServer())
      .get(`/recipes/${draft.slug}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(draft.id);
  });

  it.failing('ADMIN открывает чужой черновик по slug → 200', async () => {
    const chef = await createUser(app, { role: Role.CHEF });
    const admin = await createUser(app, { role: Role.ADMIN });
    const { accessToken } = await loginAs(app, admin.email);
    const draft = await createRecipe(app, { authorId: chef.id, isPublished: false });

    const res = await request(app.getHttpServer())
      .get(`/recipes/${draft.slug}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });

  it('черновик виден автору в списке /recipes/my', async () => {
    const chef = await createUser(app, { role: Role.CHEF });
    const { accessToken } = await loginAs(app, chef.email);
    const draft = await createRecipe(app, { authorId: chef.id, isPublished: false });

    const res = await request(app.getHttpServer())
      .get('/recipes/my')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.map((r: { id: string }) => r.id)).toContain(draft.id);
  });

  it('аноним не видит черновик → 404', async () => {
    const chef = await createUser(app, { role: Role.CHEF });
    const draft = await createRecipe(app, { authorId: chef.id, isPublished: false });

    await request(app.getHttpServer()).get(`/recipes/${draft.slug}`).expect(404);
  });

  // Обязан остаться зелёным и ПОСЛЕ фикса: чужой черновик → 404, не 403.
  // Сейчас сервис бросает ForbiddenException для авторизованного не-автора.
  // PR8 должен поменять это на NotFound, иначе появится оракул существования черновиков.
  it('другой автор не видит чужой черновик → 404', async () => {
    const owner = await createUser(app, { role: Role.CHEF });
    const other = await createUser(app, { role: Role.CHEF });
    const { accessToken } = await loginAs(app, other.email);
    const draft = await createRecipe(app, { authorId: owner.id, isPublished: false });

    await request(app.getHttpServer())
      .get(`/recipes/${draft.slug}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});