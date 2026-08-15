import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Схема регистрации
export const RegisterSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(30, { message: 'Username cannot exceed 30 characters' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: 'Username can only contain letters, numbers, underscores and hyphens',
    }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Схема логина
export const LoginSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// Генерация DTO-классов для внедрения типов в контроллеры
export class RegisterDto extends createZodDto(RegisterSchema) { }
export class LoginDto extends createZodDto(LoginSchema) { }