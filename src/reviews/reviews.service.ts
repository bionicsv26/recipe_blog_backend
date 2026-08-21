import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Пересчет и сохранение averageRating и ratingsCount в транзакции
   */
  private async recalculateRecipeRating(tx: Prisma.TransactionClient, recipeId: string) {
    const aggregate = await tx.review.aggregate({
      where: { recipeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = aggregate._avg.rating
      ? new Prisma.Decimal(aggregate._avg.rating.toFixed(2))
      : new Prisma.Decimal(0.0);
    const ratingsCount = aggregate._count.rating || 0;

    await tx.recipe.update({
      where: { id: recipeId },
      data: {
        averageRating,
        ratingsCount,
      },
    });
  }

  async createOrUpdate(recipeId: string, dto: CreateReviewDto, user: CurrentUserData) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe || !recipe.isPublished) {
      throw new NotFoundException('Опубликованный рецепт не найден');
    }

    if (recipe.authorId === user.id) {
      throw new BadRequestException('Автор не может оценивать собственный рецепт');
    }

    return this.prisma.$transaction(async (tx) => {
      // Создание или обновление отзыва (upsert)
      const review = await tx.review.upsert({
        where: {
          userId_recipeId: {
            userId: user.id,
            recipeId,
          },
        },
        update: {
          rating: dto.rating,
          comment: dto.comment,
        },
        create: {
          userId: user.id,
          recipeId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      // Синхронизация фото к отзыву
      if (dto.images) {
        await tx.reviewImage.deleteMany({ where: { reviewId: review.id } });
        if (dto.images.length > 0) {
          await tx.reviewImage.createMany({
            data: dto.images.map((img) => ({
              reviewId: review.id,
              url: img.url,
              order: img.order,
            })),
          });
        }
      }

      // Пересчет средней оценки в модели Recipe
      await this.recalculateRecipeRating(tx, recipeId);

      return tx.review.findUnique({
        where: { id: review.id },
        include: {
          images: { orderBy: { order: 'asc' } },
          user: {
            select: {
              id: true,
              profile: { select: { username: true, avatarUrl: true } },
            },
          },
        },
      });
    });
  }

  async findByRecipe(recipeId: string, query: QueryReviewsDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { recipeId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' } },
          user: {
            select: {
              id: true,
              profile: { select: { username: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.review.count({ where: { recipeId } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(id: string, user: CurrentUserData) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Отзыв с ID "${id}" не найден`);
    }

    if (review.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      throw new ForbiddenException('У вас нет прав на удаление этого отзыва');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await this.recalculateRecipeRating(tx, review.recipeId);
    });

    return { message: 'Отзыв успешно удален' };
  }
}