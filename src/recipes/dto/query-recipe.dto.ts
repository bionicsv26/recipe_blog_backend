import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryRecipeSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD'] as const).optional(),
  authorId: z.uuid().optional(),
  ingredient: z.string().trim().optional(),
  categorySlug: z.string().trim().optional(),
  tagSlug: z.string().trim().optional(),
});

export class QueryRecipeDto extends createZodDto(QueryRecipeSchema) { }