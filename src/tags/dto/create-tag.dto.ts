import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateTagSchema = z.object({
    name: z
        .string({ message: 'Название тега обязательно' })
        .trim()
        .min(2, 'Название тега должно содержать минимум 2 символа')
        .max(50, 'Название тега не должно превышать 50 символов'),
});

export class CreateTagDto extends createZodDto(CreateTagSchema) { }