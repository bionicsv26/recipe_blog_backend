import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UploadQuerySchema = z.object({
  folder: z
    .enum(['temp', 'recipes', 'avatars', 'reviews'], {
      message: 'Недопустимая целевая папка загрузки',
    })
    .default('temp'),
});

export class UploadQueryDto extends createZodDto(UploadQuerySchema) {}
