import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { QueryRecipeDto } from './dto/query-recipe.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) { }

  /**
   * 1. Публичный поиск и каталог опубликованных рецептов с пагинацией и фильтрами
   * GET /recipes?page=1&limit=10&search=пирог&difficulty=EASY
   */
  @Public()
  @Get()
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
  @Get('my')
  async findMyRecipes(@CurrentUser() user: CurrentUserData) {
    return this.recipesService.findMyRecipes(user);
  }

  /**
   * 3. Публичный просмотр рецепта по slug (для неопубликованных доступ только автору/админу)
   * GET /recipes/shokoladnyy-tort-1
   */
  @Public()
  @Get(':slug')
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
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  @Patch(':id')
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
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.recipesService.remove(id, user);
  }
}