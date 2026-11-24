import {
  AbilityBuilder,
  createMongoAbility,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import {
  Category,
  Favorite,
  Recipe,
  Review,
  Role,
  Tag,
  User,
} from '@prisma/client';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export type AppSubjects =
  | 'all'
  | 'Recipe'
  | 'User'
  | 'Review'
  | 'Tag'
  | 'Category'
  | 'Favorite'
  | 'Upload'
  | InferSubjects<Recipe | User | Review | Tag | Category | Favorite, true>;

export type AppAbility = MongoAbility<[Action, AppSubjects]>;

export interface AbilityUser {
  id: string;
  role: Role;
}

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AbilityUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    // Базовые публичные разрешения для всех авторизованных ролей
    can(Action.Read, 'Category');
    can(Action.Read, 'Tag');
    can(Action.Read, 'Review');
    can(Action.Create, 'Upload');

    switch (user.role) {
      case Role.ADMIN:
        // Полный доступ ко всем сущностям и действиям
        can(Action.Manage, 'all');
        break;

      case Role.MODERATOR:
        // Чтение всего каталога и управление контентом
        can(Action.Read, 'all');

        // Рецепты: создание, удаление любых, редактирование только своих
        can(Action.Create, 'Recipe');
        can(Action.Delete, 'Recipe');
        can(Action.Update, 'Recipe', { authorId: user.id });

        // Отзывы: создание, удаление любых (модерация), редактирование своих
        can(Action.Create, 'Review');
        can(Action.Delete, 'Review');
        can(Action.Update, 'Review', { userId: user.id });

        // Справочники: управление тегами и создание категорий
        can(Action.Create, 'Tag');
        can(Action.Update, 'Tag');
        can(Action.Delete, 'Tag');
        can(Action.Create, 'Category');

        // Профиль: чтение и обновление своего аккаунта
        can(Action.Read, 'User', { id: user.id });
        can(Action.Update, 'User', { id: user.id });

        // Избранное: управление только своими закладками
        can(Action.Create, 'Favorite');
        can(Action.Read, 'Favorite', { userId: user.id });
        can(Action.Delete, 'Favorite', { userId: user.id });

        // Медиа: расширенное управление загрузками
        can(Action.Manage, 'Upload');
        break;

      case Role.CHEF:
        // Рецепты: создание, чтение опубликованных и своих черновиков, управление своими
        can(Action.Create, 'Recipe');
        can(Action.Read, 'Recipe', { isPublished: true });
        can(Action.Read, 'Recipe', { authorId: user.id });
        can(Action.Update, 'Recipe', { authorId: user.id });
        can(Action.Delete, 'Recipe', { authorId: user.id });

        // Отзывы: создание и управление своими отзывами
        can(Action.Create, 'Review');
        can(Action.Update, 'Review', { userId: user.id });
        can(Action.Delete, 'Review', { userId: user.id });

        // Теги: добавление новых тегов для рецептов
        can(Action.Create, 'Tag');

        // Профиль: чтение и обновление своего аккаунта
        can(Action.Read, 'User', { id: user.id });
        can(Action.Update, 'User', { id: user.id });

        // Избранное: управление только своими закладками
        can(Action.Create, 'Favorite');
        can(Action.Read, 'Favorite', { userId: user.id });
        can(Action.Delete, 'Favorite', { userId: user.id });

        // Медиа: загрузка в рабочие папки рецептов
        can(Action.Manage, 'Upload');
        break;

      case Role.USER:
      default:
        // Рецепты: чтение только опубликованных
        can(Action.Read, 'Recipe', { isPublished: true });

        // Отзывы: создание и управление своими
        can(Action.Create, 'Review');
        can(Action.Update, 'Review', { userId: user.id });
        can(Action.Delete, 'Review', { userId: user.id });

        // Профиль: чтение и обновление своего аккаунта
        can(Action.Read, 'User', { id: user.id });
        can(Action.Update, 'User', { id: user.id });

        // Избранное: управление только своими закладками
        can(Action.Create, 'Favorite');
        can(Action.Read, 'Favorite', { userId: user.id });
        can(Action.Delete, 'Favorite', { userId: user.id });
        break;
    }

    return build({
      detectSubjectType: (item) => {
        if (!item || typeof item === 'string') {
          return item as ExtractSubjectType<AppSubjects>;
        }

        const obj = item as Record<string, any>;

        if (obj.__typename) {
          return obj.__typename;
        }

        // Детекция сущностей по характерным полям Prisma моделей
        if ('cookingTime' in obj || 'prepTime' in obj || 'authorId' in obj) {
          return 'Recipe';
        }
        if ('rating' in obj && 'recipeId' in obj) {
          return 'Review';
        }
        if ('recipeId' in obj && 'userId' in obj) {
          return 'Favorite';
        }
        if ('slug' in obj && 'order' in obj) {
          return 'Category';
        }
        if ('slug' in obj && 'name' in obj) {
          return 'Tag';
        }
        if ('email' in obj || 'passwordHash' in obj) {
          return 'User';
        }

        return (obj.constructor?.name ??
          'all') as ExtractSubjectType<AppSubjects>;
      },
    });
  }
}
