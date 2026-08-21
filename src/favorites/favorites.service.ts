import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Получение списка всех избранных рецептов текущего пользователя с пагинацией
   */
  async getMyFavorites(user: CurrentUserData, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where: {
          userId: user.id,
          recipe: { isPublished: true },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recipe: {
            include: {
              author: {
                select: {
                  id: true,
                  profile: { select: { username: true, avatarUrl: true } },
                },
              },
              categories: { include: { category: true } },
              tags: { include: { tag: true } },
              _count: { select: { favoritedBy: true } },
            },
          },
        },
      }),
      this.prisma.favorite.count({
        where: {
          userId: user.id,
          recipe: { isPublished: true },
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        addedAt: item.createdAt,
        ...item.recipe,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Добавление рецепта в избранное
   */
  async add(recipeId: string, user: CurrentUserData) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe || !recipe.isPublished) {
      throw new NotFoundException('Опубликованный рецепт не найден');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_recipeId: {
          userId: user.id,
          recipeId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Рецепт уже находится в избранном');
    }

    await this.prisma.favorite.create({
      data: {
        userId: user.id,
        recipeId,
      },
    });

    return { message: 'Рецепт успешно добавлен в избранное', recipeId };
  }

  /**
   * Удаление рецепта из избранного
   */
  async remove(recipeId: string, user: CurrentUserData) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_recipeId: {
          userId: user.id,
          recipeId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Рецепт не найден в избранном');
    }

    await this.prisma.favorite.delete({
      where: {
        userId_recipeId: {
          userId: user.id,
          recipeId,
        },
      },
    });

    return { message: 'Рецепт удален из избранного', recipeId };
  }

  /**
   * Проверка, находится ли рецепт в избранном у пользователя
   */
  async checkStatus(recipeId: string, user: CurrentUserData) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_recipeId: {
          userId: user.id,
          recipeId,
        },
      },
    });

    return { isFavorite: !!favorite };
  }
}