import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User as UserEntity, Recipe as RecipeEntity, Role } from '@prisma/client';

export enum Action {
  Manage = 'manage', // Любое действие (полный доступ)
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Классы-обёртки для корректной работы CASL в рантайме с типами Prisma
export class User implements UserEntity {
  id!: string;
  email!: string;
  passwordHash!: string;
  role!: Role;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class Recipe implements RecipeEntity {
  id!: string;
  title!: string;
  slug!: string;
  description!: string | null;
  coverImageUrl!: string | null;
  isPublished!: boolean;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export type Subjects = InferSubjects<typeof Recipe | typeof User> | 'all';
export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { id: string; role: Role }): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === Role.ADMIN) {
      // Полный доступ ко всем ресурсам
      can(Action.Manage, 'all');
    } else if (user.role === Role.MODERATOR) {
      // Модератор может просматривать всё и удалять рецепты
      can(Action.Read, 'all');
      can(Action.Delete, Recipe);
      can(Action.Update, Recipe, { authorId: user.id });
    } else {
      // Обычный пользователь (USER / CHEF)
      can(Action.Read, Recipe, { isPublished: true });
      can(Action.Create, Recipe);
      can(Action.Read, Recipe, { authorId: user.id });
      can(Action.Update, Recipe, { authorId: user.id });
      can(Action.Delete, Recipe, { authorId: user.id });

      can(Action.Read, User, { id: user.id });
      can(Action.Update, User, { id: user.id });
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}