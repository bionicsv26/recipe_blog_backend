import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipesViewService } from './recipes-view.service';

@Module({
  controllers: [RecipesController],
  providers: [RecipesService, RecipesViewService],
  exports: [RecipesService],
})
export class RecipesModule { }
