import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { resetState } from './utils/reset';

describe('e2e каркас', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetState(app);
  });

  it('GET /categories → 200 и пустой список', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('GET /recipes → 200 и метаданные пагинации', async () => {
    const res = await request(app.getHttpServer()).get('/recipes').expect(200);
    expect(res.body.meta).toMatchObject({ total: 0, page: 1, limit: 10 });
  });

  it('GET /recipes/my без токена → 401', async () => {
    await request(app.getHttpServer()).get('/recipes/my').expect(401);
  });
});
