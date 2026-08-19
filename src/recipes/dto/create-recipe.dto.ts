import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Схема отдельного ингредиента
export const RecipeIngredientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Название ингредиента обязательно' })
    .max(100, { message: 'Слишком длинное название' }),
  amount: z
    .number({ message: 'Количество должно быть положительным числом' })
    .positive({ message: 'Количество должно быть больше 0' })
    .max(999999.99, { message: 'Слишком большое число' }),
  unit: z
    .string()
    .trim()
    .min(1, { message: 'Укажите единицу измерения (г, мл, шт и т.д.)' })
    .max(20),
  note: z.string().trim().max(100).optional(),
  order: z.number().int().nonnegative().default(0),
});

// Схема отдельного шага приготовления
export const RecipeStepInputSchema = z.object({
  stepNumber: z
    .number({ message: 'Номер шага должен быть числом' })
    .int({ message: 'Номер шага должен быть целым числом' })
    .positive({ message: 'Номер шага должен быть >= 1' }),
  instruction: z
    .string()
    .trim()
    .min(5, { message: 'Инструкция к шагу должна содержать минимум 5 символов' })
    .max(2000, { message: 'Превышен лимит описания шага' }),
  imageUrl: z
    .url({ message: 'Некорректный URL изображения шага' })
    .optional()
    .nullable(),
});

// Схема создания рецепта
export const CreateRecipeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: 'Название рецепта должно содержать минимум 3 символа' })
    .max(150, { message: 'Название рецепта не может превышать 150 символов' }),
  description: z
    .string()
    .trim()
    .max(500, { message: 'Описание не может превышать 500 символов' })
    .optional()
    .nullable(),
  coverImageUrl: z
    .url({ message: 'Некорректный URL обложки' })
    .optional()
    .nullable(),
  prepTime: z
    .number()
    .int()
    .nonnegative({ message: 'Время подготовки не может быть отрицательным' })
    .optional()
    .nullable(),
  cookTime: z
    .number({ message: 'Время приготовления обязательно и должно быть числом' })
    .int()
    .positive({ message: 'Время приготовления должно быть больше 0' }),
  servings: z
    .number()
    .int()
    .positive({ message: 'Количество порций должно быть не менее 1' })
    .default(1),
  difficulty: z
    .enum(['EASY', 'MEDIUM', 'HARD'] as const, {
      message: 'Сложность должна быть: EASY, MEDIUM или HARD',
    })
    .default('MEDIUM'),
  isPublished: z.boolean().default(false),
  ingredients: z
    .array(RecipeIngredientInputSchema)
    .min(1, { message: 'Рецепт должен содержать хотя бы один ингредиент' }),
  steps: z
    .array(RecipeStepInputSchema)
    .min(1, { message: 'Рецепт должен содержать хотя бы один шаг приготовления' }),
});

export class CreateRecipeDto extends createZodDto(CreateRecipeSchema) { }