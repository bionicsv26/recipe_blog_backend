import { MediaCleanupService } from './media-cleanup.service';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MediaCleanupService', () => {
  const prefix = 'https://cdn.example.com/';
  const url = (key: string) => `${prefix}${key}`;
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const keys = {
    avatar: 'avatars/user-1/avatar.webp',
    cover: 'recipes/recipe-1/cover.webp',
    step: 'recipes/recipe-1/step-1.webp',
    category: 'categories/category-1.webp',
    gallery: 'recipes/recipe-1/gallery-1.webp',
    review: 'temp/review-1.webp',
    orphan: 'temp/orphan.webp',
  };

  it('не удаляет объекты, на которые есть ссылки в БД', async () => {
    const prismaMock = {
      profile: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ avatarUrl: url(keys.avatar) }]),
      },
      recipe: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ coverImageUrl: url(keys.cover) }]),
      },
      recipeStep: {
        findMany: jest.fn().mockResolvedValue([{ imageUrl: url(keys.step) }]),
      },
      category: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ imageUrl: url(keys.category) }]),
      },
      recipeImage: {
        findMany: jest.fn().mockResolvedValue([{ url: url(keys.gallery) }]),
      },
      reviewImage: {
        findMany: jest.fn().mockResolvedValue([{ url: url(keys.review) }]),
      },
    };

    const mediaMock = {
      listAllObjects: jest
        .fn()
        .mockResolvedValue(
          Object.values(keys).map((key) => ({ key, lastModified: old })),
        ),
      extractKeyFromUrl: jest.fn((value: string) => value.replace(prefix, '')),
      deleteFiles: jest.fn().mockResolvedValue(1),
    };

    const service = new MediaCleanupService(
      prismaMock as unknown as PrismaService,
      mediaMock as unknown as MediaService,
    );

    await service.handleCleanupOrphanFiles();

    expect(mediaMock.deleteFiles).toHaveBeenCalledTimes(1);
    expect(mediaMock.deleteFiles).toHaveBeenCalledWith([keys.orphan]);
  });
});
