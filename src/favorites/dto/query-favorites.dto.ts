import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryFavoritesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export class QueryFavoritesDto extends createZodDto(QueryFavoritesSchema) { }