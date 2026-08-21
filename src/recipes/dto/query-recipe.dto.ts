import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RecipeSortBy = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  RATING: 'rating',
  POPULAR: 'popular', // по количеству добавлений в избранное / отзывов
  COOK_TIME: 'cookTime',
} as const;

export const QueryRecipeSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD'] as const).optional(),
  authorId: z.uuid().optional(),
  ingredient: z.string().trim().optional(),
  categorySlug: z.string().trim().optional(),
  tagSlug: z.string().trim().optional(),
  sortBy: z
    .enum([
      RecipeSortBy.NEWEST,
      RecipeSortBy.OLDEST,
      RecipeSortBy.RATING,
      RecipeSortBy.POPULAR,
      RecipeSortBy.COOK_TIME,
    ])
    .default(RecipeSortBy.NEWEST),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export class QueryRecipeDto extends createZodDto(QueryRecipeSchema) { }