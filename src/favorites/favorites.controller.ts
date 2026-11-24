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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { QueryFavoritesDto } from './dto/query-favorites.dto';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({
    summary: 'Получение списка рецептов в закладках текущего пользователя',
  })
  @ApiOkResponse({ description: 'Список сохраненных рецептов' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async getMyFavorites(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryFavoritesDto,
  ) {
    return this.favoritesService.getMyFavorites(user, query);
  }

  @Get(':recipeId/status')
  @ApiOperation({
    summary: 'Проверка статуса: находится ли рецепт в избранном',
  })
  @ApiOkResponse({ description: 'Флаг isFavorite (true/false)' })
  @ApiBadRequestResponse({ description: 'Некорректный UUID рецепта' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async checkStatus(
    @Param('recipeId', new ParseUUIDPipe()) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.checkStatus(recipeId, user);
  }

  @Post(':recipeId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавление рецепта в избранное' })
  @ApiCreatedResponse({ description: 'Рецепт добавлен в избранное' })
  @ApiBadRequestResponse({ description: 'Некорректный UUID рецепта' })
  @ApiNotFoundResponse({ description: 'Опубликованный рецепт не найден' })
  @ApiConflictResponse({ description: 'Рецепт уже сохранен в избранном' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async add(
    @Param('recipeId', new ParseUUIDPipe()) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.add(recipeId, user);
  }

  @Delete(':recipeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление рецепта из избранного' })
  @ApiOkResponse({ description: 'Рецепт удален из закладок' })
  @ApiBadRequestResponse({ description: 'Некорректный UUID рецепта' })
  @ApiNotFoundResponse({ description: 'Рецепт не найден в избранном' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async remove(
    @Param('recipeId', new ParseUUIDPipe()) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.remove(recipeId, user);
  }
}
