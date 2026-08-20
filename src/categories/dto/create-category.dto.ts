import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(2, { message: 'Название категории минимум 2 символа' }).max(50),
  description: z.string().trim().max(255).optional().nullable(),
  imageUrl: z.url({ message: 'Некорректный URL изображения' }).optional().nullable(),
  order: z.number().int().default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) { }
export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) { }