import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryTagsSchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class QueryTagsDto extends createZodDto(QueryTagsSchema) { }