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
import { FavoritesService } from './favorites.service';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) { }

  @Get()
  async getMyFavorites(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.favoritesService.getMyFavorites(user, Number(page), Number(limit));
  }

  @Get(':recipeId/status')
  async checkStatus(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.checkStatus(recipeId, user);
  }

  @Post(':recipeId')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.add(recipeId, user);
  }

  @Delete(':recipeId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.favoritesService.remove(recipeId, user);
  }
}