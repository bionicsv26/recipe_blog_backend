import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Схема регистрации
export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .pipe(z.email({ message: 'Invalid email address' })),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-ZА-ЯЁ]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(30, { message: 'Username cannot exceed 30 characters' })
    .regex(/^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/, {
      message:
        'Username can only contain Latin or Cyrillic letters, numbers, underscores and hyphens',
    }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(300, { message: 'Bio cannot exceed 300 characters' }).optional(),
});

// Схема логина
export const LoginSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// Схема смены пароля
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .regex(/[A-ZА-ЯЁ]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// Генерация DTO-классов для внедрения типов в контроллеры
export class RegisterDto extends createZodDto(RegisterSchema) { }
export class LoginDto extends createZodDto(LoginSchema) { }
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) { }