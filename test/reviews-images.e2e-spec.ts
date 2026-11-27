import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { resetState } from './utils/reset';
import { createUser, createRecipe, loginAs } from './utils/factories';

describe('REV-01 · фото отзыва при повторном POST', () => {
  let app: INestApplication;
  let token: string;
  let recipeId: string;

  const base = 'http://localhost:9000/recipe-media-test/temp';
  const images = [{ url: `${base}/review-1.webp`, order: 0 }];

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetState(app);
    const chef = await createUser(app, { role: Role.CHEF });
    const reviewer = await createUser(app);
    const recipe = await createRecipe(app, { authorId: chef.id });
    recipeId = recipe.id;
    token = (await loginAs(app, reviewer.email)).accessToken;
  });

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(`/recipes/${recipeId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('повторный POST без images не удаляет фото', async () => {
    await post({ rating: 5, images }).expect(200);
    const res = await post({ rating: 4 }).expect(200);

    expect(res.body.images).toHaveLength(1);
    expect(res.body.rating).toBe(4);
  });

  it('явный images: [] очищает фото', async () => {
    await post({ rating: 5, images }).expect(200);
    const res = await post({ rating: 5, images: [] }).expect(200);

    expect(res.body.images).toHaveLength(0);
  });

  it('images с новым составом заменяет фото', async () => {
    await post({ rating: 5, images }).expect(200);
    const two = [
      { url: `${base}/a.webp`, order: 0 },
      { url: `${base}/b.webp`, order: 1 },
    ];
    const res = await post({ rating: 5, images: two }).expect(200);

    expect(res.body.images).toHaveLength(2);
  });

  it('первый POST без images создаёт отзыв без фото', async () => {
    const res = await post({ rating: 3 }).expect(200);

    expect(res.body.images).toHaveLength(0);
  });
});
