import {
  Body,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  /**
   * Публичное получение списка отзывов конкретного рецепта
   * GET /recipes/:recipeId/reviews
   */
  @Public()
  @Get('recipes/:recipeId/reviews')
  @ApiOperation({ summary: 'Публичное получение отзывов к конкретному рецепту' })
  @ApiOkResponse({ description: 'Список отзывов с пагинацией' })
  @ApiBadRequestResponse({ description: 'Некорректный UUID рецепта' })
  async findByRecipe(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findByRecipe(recipeId, query);
  }

  /**
   * Защищенный роут: Добавление или обновление отзыва к рецепту
   * POST /recipes/:recipeId/reviews
   */
  @ApiBearerAuth('JWT-auth')
  @Post('recipes/:recipeId/reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Создание или обновление своего отзыва к рецепту' })
  @ApiOkResponse({ description: 'Отзыв сохранен и рейтинг рецепта пересчитан' })
  @ApiBadRequestResponse({ description: 'Автор не может оценивать свой рецепт или ошибка валидации' })
  @ApiNotFoundResponse({ description: 'Рецепт не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async createOrUpdate(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reviewsService.createOrUpdate(recipeId, dto, user);
  }

  /**
   * Защищенный роут: Удаление отзыва (автор или модератор/админ)
   * DELETE /reviews/:id
   */
  @ApiBearerAuth('JWT-auth')
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление отзыва по ID (автор или модератор)' })
  @ApiOkResponse({ description: 'Отзыв удален' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав для удаления' })
  @ApiNotFoundResponse({ description: 'Отзыв не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reviewsService.remove(id, user);
  }
}