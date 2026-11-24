import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RecipeSortBy = {
  CREATED_AT: 'createdAt',
  RATING: 'rating',
  POPULAR: 'popular',
  COOK_TIME: 'cookTime',
} as const;

const emptyToUndefined = (val: unknown) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val;
};

export const QueryRecipeSchema = z
  .object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().default(1),
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().max(50).default(10),
    ),

    search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    difficulty: z.preprocess(
      emptyToUndefined,
      z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    ),
    authorId: z.preprocess(
      emptyToUndefined,
      z.uuid({ message: 'Invalid author UUID' }).optional(),
    ),
    ingredient: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    categorySlug: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    tagSlug: z.preprocess(emptyToUndefined, z.string().trim().optional()),

    sortBy: z.preprocess(
      emptyToUndefined,
      z
        .enum(Object.values(RecipeSortBy) as [string, ...string[]])
        .default(RecipeSortBy.CREATED_AT),
    ),

    sortOrder: z.preprocess(
      emptyToUndefined,
      z.enum(['asc', 'desc']).default('desc'),
    ),
  })
  .transform((data) => ({
    ...data,
    sortOrder: data.sortOrder || 'desc',
  }));

export class QueryRecipeDto extends createZodDto(QueryRecipeSchema) {}
