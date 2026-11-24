import { createZodDto } from 'nestjs-zod';
import { CreateRecipeSchema } from './create-recipe.dto';

export const UpdateRecipeSchema = CreateRecipeSchema.partial();

export class UpdateRecipeDto extends createZodDto(UpdateRecipeSchema) {}
