import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, Recipe, Role } from '@prisma/client';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Передаем интерфейсы Prisma напрямую и указываем true (for interface mode)
export type AppSubjects =
  | 'all'
  | 'Recipe'
  | 'User'
  | InferSubjects<Recipe | User, true>;

export type AppAbility = MongoAbility<[Action, AppSubjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { id: string; role: Role }): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === Role.ADMIN) {
      can(Action.Manage, 'all');
    } else if (user.role === Role.MODERATOR) {
      can(Action.Read, 'all');
      can(Action.Delete, 'Recipe');
      can(Action.Update, 'Recipe', { authorId: user.id });
    } else {
      can(Action.Create, 'Recipe');
      can(Action.Read, 'Recipe', { isPublished: true });
      can(Action.Read, 'Recipe', { authorId: user.id });
      can(Action.Update, 'Recipe', { authorId: user.id });
      can(Action.Delete, 'Recipe', { authorId: user.id });

      can(Action.Read, 'User', { id: user.id });
      can(Action.Update, 'User', { id: user.id });
    }

    return build({
      detectSubjectType: (item) => {
        if (!item || typeof item === 'string') {
          return item as ExtractSubjectType<AppSubjects>;
        }
        return (item.constructor?.name === 'Object'
          ? (item as any).__typename || 'Recipe'
          : item.constructor.name) as ExtractSubjectType<AppSubjects>;
      },
    });
  }
}