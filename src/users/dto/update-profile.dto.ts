import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(30, { message: 'Username cannot exceed 30 characters' })
    .regex(/^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/, {
      message: 'Username can only contain letters, numbers, underscores and hyphens',
    })
    .optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  bio: z.string().max(300, { message: 'Bio cannot exceed 300 characters' }).optional(),
  avatarUrl: z.url().nullable().optional(),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) { }