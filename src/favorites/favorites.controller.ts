import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) { }

  @Get()
  @ApiOperation({ summary: 'Получение списка рецептов в закладках текущего пользователя' })
  @ApiOkResponse({ description: 'Список сохраненных рецептов' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async getMyFavorites(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.favoritesService.getMyFavorites(user, Number(page), Number(limit));
  }

  @Get(':recipeId/status')
  @ApiOperation({ summary: 'Проверка статуса: находится ли рецепт в избранном' })
  @ApiOkResponse({ description: 'Флаг isFavorite (true/false)' })
  @ApiBadRequestResponse({ description: 'Некорректный UUID рецепта' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async checkStatus(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.checkStatus(recipeId, user);
  }

  @Post(':recipeId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавление рецепта в избранное' })
  @ApiCreatedResponse({ description: 'Рецепт добавлен в избранное' })
  @ApiNotFoundResponse({ description: 'Опубликованный рецепт не найден' })
  @ApiConflictResponse({ description: 'Рецепт уже сохранен в избранном' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async add(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.add(recipeId, user);
  }

  @Delete(':recipeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление рецепта из избранного' })
  @ApiOkResponse({ description: 'Рецепт удален из закладок' })
  @ApiNotFoundResponse({ description: 'Рецепт не найден в избранном' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async remove(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.remove(recipeId, user);
  }
}