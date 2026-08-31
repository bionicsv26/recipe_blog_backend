import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, Recipe, Review, Tag, Category, Favorite, Role } from '@prisma/client';

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
  | InferSubjects<Recipe | User | Review | Tag | Category | Favorite, true>;

export type AppAbility = MongoAbility<[Action, AppSubjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { id: string; role: Role }): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Базовый публичный доступ на чтение справочников
    can(Action.Read, 'Category');
    can(Action.Read, 'Tag');
    can(Action.Read, 'Review');

    switch (user.role) {
      case Role.ADMIN:
        can(Action.Manage, 'all');
        break;

      case Role.MODERATOR:
        can(Action.Read, 'all');
        can(Action.Create, 'Recipe');
        can(Action.Delete, 'Recipe');
        can(Action.Update, 'Recipe', { authorId: user.id });
        can(Action.Read, 'User', { id: user.id });
        can(Action.Update, 'User', { id: user.id });
        can(Action.Create, 'Tag');
        can(Action.Delete, 'Tag');
        can(Action.Create, 'Review');
        can(Action.Delete, 'Review');
        can(Action.Update, 'Review', { userId: user.id });
        can(Action.Create, 'Category');
        can(Action.Create, 'Favorite');
        can(Action.Read, 'Favorite', { userId: user.id });
        can(Action.Delete, 'Favorite', { userId: user.id });
        break;

      case Role.CHEF:
        can(Action.Create, 'Recipe');
        can(Action.Read, 'Recipe', { isPublished: true });
        can(Action.Read, 'Recipe', { authorId: user.id });
        can(Action.Update, 'Recipe', { authorId: user.id });
        can(Action.Delete, 'Recipe', { authorId: user.id });
        can(Action.Read, 'User', { id: user.id });
        can(Action.Update, 'User', { id: user.id });
        can(Action.Create, 'Tag');
        can(Action.Create, 'Review');
        can(Action.Update, 'Review', { userId: user.id });
        can(Action.Delete, 'Review', { userId: user.id });
        can(Action.Create, 'Favorite');
        can(Action.Read, 'Favorite', { userId: user.id });
        can(Action.Delete, 'Favorite', { userId: user.id });
        break;

      case Role.USER:
      default:
        can(Action.Read, 'Recipe', { isPublished: true });
        can(Action.Read, 'User', { id: user.id });
        can(Action.Update, 'User', { id: user.id });
        can(Action.Create, 'Review');
        can(Action.Update, 'Review', { userId: user.id });
        can(Action.Delete, 'Review', { userId: user.id });
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
        if ((item as any).__typename) {
          return (item as any).__typename;
        }
        if ('prepTime' in item || 'authorId' in item) return 'Recipe';
        if ('rating' in item || 'comment' in item) return 'Review';
        if ('slug' in item && 'order' in item) return 'Category';
        if ('recipeId' in item && 'userId' in item && !('rating' in item)) return 'Favorite';
        if ('slug' in item && 'name' in item && !('cookTime' in item)) return 'Tag';
        if ('email' in item) return 'User';
        return item.constructor?.name as ExtractSubjectType<AppSubjects>;
      },
    });
  }
}