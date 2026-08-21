import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryReviewsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export class QueryReviewsDto extends createZodDto(QueryReviewsSchema) { }