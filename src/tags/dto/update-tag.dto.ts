import { createZodDto } from 'nestjs-zod';
import { CreateTagSchema } from './create-tag.dto';

export const UpdateTagSchema = CreateTagSchema.partial();

export class UpdateTagDto extends createZodDto(UpdateTagSchema) {}
