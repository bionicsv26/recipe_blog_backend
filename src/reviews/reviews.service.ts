import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { subject } from '@casl/ability';
import { PrismaService } from '../prisma/prisma.service';
import { CaslAbilityFactory, Action } from '../casl/casl-ability.factory';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) { }

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

  /**
   * Создание или обновление отзыва к рецепту
   */
  async createOrUpdate(recipeId: string, dto: CreateReviewDto, user: CurrentUserData) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, authorId: true, isPublished: true },
    });

    if (!recipe || !recipe.isPublished) {
      throw new NotFoundException('Опубликованный рецепт не найден');
    }

    if (recipe.authorId === user.id) {
      throw new BadRequestException('Автор не может оценивать собственный рецепт');
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    // Проверяем наличие уже оставленного отзыва
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_recipeId: {
          userId: user.id,
          recipeId,
        },
      },
    });

    // Проверка CASL прав
    if (existingReview) {
      if (ability.cannot(Action.Update, subject('Review', existingReview as any))) {
        throw new ForbiddenException('У вас нет прав на редактирование этого отзыва');
      }
    } else {
      if (ability.cannot(Action.Create, 'Review')) {
        throw new ForbiddenException('У вас нет прав на создание отзыва');
      }
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

  /**
   * Публичное получение отзывов с пагинацией
   */
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

  /**
   * Удаление отзыва (Автор, Модератор или Администратор)
   */
  async remove(id: string, user: CurrentUserData) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Отзыв с ID "${id}" не найден`);
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    // CASL проверяет: { userId: user.id } или 'manage all' / 'delete Review' (MODERATOR/ADMIN)
    if (ability.cannot(Action.Delete, subject('Review', review as any))) {
      throw new ForbiddenException('У вас нет прав на удаление этого отзыва');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await this.recalculateRecipeRating(tx, review.recipeId);
    });

    return { message: 'Отзыв успешно удален' };
  }
}