import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Role } from '@prisma/client';

const roleValues = Object.values(Role) as [Role, ...Role[]];

export const ChangeRoleSchema = z.object({
  role: z.enum(roleValues, {
    message: 'Указана некорректная роль',
  }),
});

export class ChangeRoleDto extends createZodDto(ChangeRoleSchema) {}
