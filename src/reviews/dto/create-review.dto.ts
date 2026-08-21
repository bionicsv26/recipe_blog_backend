import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ReviewImageInputSchema = z.object({
  url: z.url({ message: 'Некорректный URL изображения' }),
  order: z.number().int().nonnegative().default(0),
});

export const CreateReviewSchema = z.object({
  rating: z
    .number({ message: 'Оценка обязательна' })
    .int({ message: 'Оценка должна быть целым числом' })
    .min(1, { message: 'Минимальная оценка — 1' })
    .max(5, { message: 'Максимальная оценка — 5' }),
  comment: z
    .string()
    .trim()
    .max(1000, { message: 'Длина комментария не может превышать 1000 символов' })
    .optional()
    .nullable(),
  images: z.array(ReviewImageInputSchema).max(5, { message: 'Максимум 5 фото' }).default([]),
});

export class CreateReviewDto extends createZodDto(CreateReviewSchema) { }