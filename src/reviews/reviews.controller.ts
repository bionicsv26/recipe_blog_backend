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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  /**
   * Публичное получение списка отзывов конкретного рецепта
   * GET /recipes/:recipeId/reviews
   */
  @Public()
  @Get('recipes/:recipeId/reviews')
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
  @Post('recipes/:recipeId/reviews')
  @HttpCode(HttpStatus.OK)
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
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reviewsService.remove(id, user);
  }
}