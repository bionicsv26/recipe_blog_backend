import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipeDto } from './dto/query-recipe.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('Recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) { }

  /**
   * 1. Публичный поиск и каталог опубликованных рецептов с пагинацией и фильтрами
   * GET /recipes?page=1&limit=10&search=пирог&difficulty=EASY
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Каталог рецептов с пагинацией, фильтрацией и сортировкой' })
  @ApiOkResponse({ description: 'Список опубликованных рецептов с метаданными пагинации' })
  async findAll(
    @Query() query: QueryRecipeDto,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    return this.recipesService.findAll(query, currentUser);
  }

  /**
   * 2. Защищенный роут: Получение всех рецептов текущего авторизованного пользователя (включая черновики)
   * GET /recipes/my
   * ВАЖНО: Маршрут /my объявлен выше /:slug, чтобы NestJS не перехватывал 'my' как параметр slug.
   */
  @ApiBearerAuth('JWT-auth')
  @Get('my')
  @ApiOperation({ summary: 'Список рецептов текущего авторизованного автора (включая черновики)' })
  @ApiOkResponse({ description: 'Список рецептов автора' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async findMyRecipes(@CurrentUser() user: CurrentUserData) {
    return this.recipesService.findMyRecipes(user);
  }

  @Public()
  @Get(':id/similar')
  @ApiOperation({ summary: 'Получение похожих рекомендаций к рецепту по категориям и тегам' })
  @ApiOkResponse({ description: 'Список из 3-5 похожих опубликованных рецептов' })
  @ApiNotFoundResponse({ description: 'Исходный рецепт не найден' })
  async findSimilar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.recipesService.findSimilar(id, limit ? Math.min(Number(limit), 10) : 4);
  }

  /**
   * 3. Публичный просмотр рецепта по slug (для неопубликованных доступ только автору/админу)
   * GET /recipes/shokoladnyy-tort-1
   */
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Получение детальной информации о рецепте по slug' })
  @ApiOkResponse({ description: 'Детальные данные рецепта' })
  @ApiNotFoundResponse({ description: 'Рецепт не найден' })
  @ApiForbiddenResponse({ description: 'Нет доступа к закрытому черновику' })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    return this.recipesService.findBySlug(slug, currentUser);
  }

  /**
   * 4. Защищенный роут: Создание нового рецепта
   * POST /recipes
   */
  @ApiBearerAuth('JWT-auth')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание нового рецепта' })
  @ApiCreatedResponse({ description: 'Рецепт успешно создан' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации структуры рецепта' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав для создания рецепта' })
  async create(
    @Body() dto: CreateRecipeDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.recipesService.create(dto, user);
  }

  /**
   * 5. Защищенный роут: Частичное обновление рецепта (проверка прав в RecipesService через CASL)
   * PATCH /recipes/:id
   */
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Редактирование рецепта' })
  @ApiOkResponse({ description: 'Рецепт успешно обновлен' })
  @ApiBadRequestResponse({ description: 'Некорректные данные обновления' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Редактирование разрешено только автору или администратору' })
  @ApiNotFoundResponse({ description: 'Рецепт не найден' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.recipesService.update(id, dto, user);
  }

  /**
   * 6. Защищенный роут: Удаление рецепта (автор или ADMIN/MODERATOR)
   * DELETE /recipes/:id
   */
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление рецепта' })
  @ApiOkResponse({ description: 'Рецепт успешно удален' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Удаление разрешено только автору или администратору' })
  @ApiNotFoundResponse({ description: 'Рецепт не найден' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.recipesService.remove(id, user);
  }
}