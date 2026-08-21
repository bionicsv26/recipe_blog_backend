import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaslAbilityFactory, Action } from '../casl/casl-ability.factory';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipeDto, RecipeSortBy } from './dto/query-recipe.dto';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { slugify } from '../common/utils/slugify.util';
import { Prisma } from '@prisma/client';
import { subject } from '@casl/ability';

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) { }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
    let candidateSlug = baseSlug;
    let counter = 1;

    while (await this.prisma.recipe.findUnique({ where: { slug: candidateSlug } })) {
      candidateSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return candidateSlug;
  }

  /**
   * Создание тегов или получение существующих id
   */
  private async resolveTagIds(tx: Prisma.TransactionClient, tagNames: string[]): Promise<string[]> {
    if (!tagNames || tagNames.length === 0) return [];

    const uniqueNames = Array.from(new Set(tagNames.map((t) => t.trim().toLowerCase()))).filter(Boolean);

    const tagIds: string[] = [];
    for (const name of uniqueNames) {
      const slug = slugify(name);
      const tag = await tx.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
      tagIds.push(tag.id);
    }

    return tagIds;
  }

  async create(dto: CreateRecipeDto, user: CurrentUserData) {
    const ability = this.caslAbilityFactory.createForUser(user);
    if (!ability.can(Action.Create, 'Recipe')) {
      throw new ForbiddenException('You do not have permission to create recipes');
    }

    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.$transaction(async (tx) => {
      const tagIds = await this.resolveTagIds(tx, dto.tags);

      return tx.recipe.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          coverImageUrl: dto.coverImageUrl,
          prepTime: dto.prepTime,
          cookTime: dto.cookTime,
          servings: dto.servings,
          difficulty: dto.difficulty,
          isPublished: dto.isPublished,
          authorId: user.id,
          ingredients: {
            create: dto.ingredients.map((ing) => ({
              name: ing.name,
              amount: new Prisma.Decimal(ing.amount),
              unit: ing.unit,
              note: ing.note,
              order: ing.order,
            })),
          },
          steps: {
            create: dto.steps.map((st) => ({
              stepNumber: st.stepNumber,
              instruction: st.instruction,
              imageUrl: st.imageUrl,
            })),
          },
          categories: {
            create: dto.categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
          tags: {
            create: tagIds.map((tagId) => ({
              tagId,
            })),
          },
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { stepNumber: 'asc' } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          author: {
            select: {
              id: true,
              email: true,
              profile: { select: { username: true, avatarUrl: true } },
            },
          },
        },
      });
    });
  }

  private buildOrderBy(
    sortBy: string,
    order: 'asc' | 'desc',
  ): Prisma.RecipeOrderByWithRelationInput[] {
    switch (sortBy) {
      case RecipeSortBy.RATING:
        return [
          { averageRating: order },
          { ratingsCount: 'desc' }, // tie-breaker: при равном рейтинге выше тот, где больше оценок
        ];
      case RecipeSortBy.POPULAR:
        return [
          { favoritedBy: { _count: order } },
          { ratingsCount: order },
        ];
      case RecipeSortBy.COOK_TIME:
        return [{ cookTime: order }];
      case RecipeSortBy.OLDEST:
        return [{ createdAt: 'asc' }];
      case RecipeSortBy.NEWEST:
      default:
        return [{ createdAt: order }];
    }
  }

  async findAll(query: QueryRecipeDto, currentUser?: CurrentUserData) {
    const {
      page,
      limit,
      search,
      difficulty,
      authorId,
      ingredient,
      categorySlug,
      tagSlug,
      sortBy,
      order,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RecipeWhereInput = {
      isPublished: true,
      ...(difficulty && { difficulty }),
      ...(authorId && { authorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(ingredient && {
        ingredients: {
          some: { name: { contains: ingredient, mode: 'insensitive' } },
        },
      }),
      ...(categorySlug && {
        categories: {
          some: { category: { slug: categorySlug } },
        },
      }),
      ...(tagSlug && {
        tags: {
          some: { tag: { slug: tagSlug } },
        },
      }),
    };

    const orderBy = this.buildOrderBy(sortBy, order);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          author: {
            select: {
              id: true,
              profile: { select: { username: true, avatarUrl: true } },
            },
          },
          _count: {
            select: {
              ingredients: true,
              steps: true,
              favoritedBy: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.recipe.count({ where }),
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

  async findBySlug(slug: string, currentUser?: CurrentUserData) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { slug },
      include: {
        ingredients: { orderBy: { order: 'asc' } },
        steps: { orderBy: { stepNumber: 'asc' } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        images: { orderBy: { order: 'asc' } },
        author: {
          select: {
            id: true,
            profile: { select: { username: true, avatarUrl: true, bio: true } },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with slug "${slug}" not found`);
    }

    if (!recipe.isPublished) {
      if (!currentUser) {
        throw new NotFoundException(`Recipe with slug "${slug}" not found`);
      }
      const ability = this.caslAbilityFactory.createForUser(currentUser);
      if (!ability.can(Action.Read, subject('Recipe', recipe as any))) {
        throw new ForbiddenException('You cannot access this draft recipe');
      }
    }

    return recipe;
  }

  async update(id: string, dto: UpdateRecipeDto, user: CurrentUserData) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true, steps: true },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID "${id}" not found`);
    }

    const ability = this.caslAbilityFactory.createForUser(user);
    if (!ability.can(Action.Update, subject('Recipe', recipe as any))) {
      throw new ForbiddenException('You are not allowed to edit this recipe');
    }

    let slug = recipe.slug;
    if (dto.title && dto.title !== recipe.title) {
      slug = await this.generateUniqueSlug(dto.title);
    }

    return this.prisma.$transaction(async (tx) => {
      // Обновление ингредиентов
      if (dto.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: dto.ingredients.map((ing) => ({
            recipeId: id,
            name: ing.name,
            amount: new Prisma.Decimal(ing.amount),
            unit: ing.unit,
            note: ing.note,
            order: ing.order,
          })),
        });
      }

      // Обновление шагов
      if (dto.steps) {
        await tx.recipeStep.deleteMany({ where: { recipeId: id } });
        await tx.recipeStep.createMany({
          data: dto.steps.map((st) => ({
            recipeId: id,
            stepNumber: st.stepNumber,
            instruction: st.instruction,
            imageUrl: st.imageUrl,
          })),
        });
      }

      // Обновление категорий
      if (dto.categoryIds) {
        await tx.recipeCategory.deleteMany({ where: { recipeId: id } });
        if (dto.categoryIds.length > 0) {
          await tx.recipeCategory.createMany({
            data: dto.categoryIds.map((categoryId) => ({
              recipeId: id,
              categoryId,
            })),
          });
        }
      }

      // Обновление тегов
      if (dto.tags) {
        const tagIds = await this.resolveTagIds(tx, dto.tags);
        await tx.recipeTag.deleteMany({ where: { recipeId: id } });
        if (tagIds.length > 0) {
          await tx.recipeTag.createMany({
            data: tagIds.map((tagId) => ({
              recipeId: id,
              tagId,
            })),
          });
        }
      }

      return tx.recipe.update({
        where: { id },
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          coverImageUrl: dto.coverImageUrl,
          prepTime: dto.prepTime,
          cookTime: dto.cookTime,
          servings: dto.servings,
          difficulty: dto.difficulty,
          isPublished: dto.isPublished,
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { stepNumber: 'asc' } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      });
    });
  }

  async remove(id: string, user: CurrentUserData): Promise<{ message: string }> {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID "${id}" not found`);
    }

    const ability = this.caslAbilityFactory.createForUser(user);
    if (!ability.can(Action.Delete, subject('Recipe', recipe as any))) {
      throw new ForbiddenException('You are not allowed to delete this recipe');
    }

    await this.prisma.recipe.delete({ where: { id } });
    return { message: 'Recipe deleted successfully' };
  }

  async findMyRecipes(user: CurrentUserData) {
    return this.prisma.recipe.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        _count: { select: { ingredients: true, steps: true } },
      },
    });
  }
}