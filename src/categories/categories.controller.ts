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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Получение списка всех категорий' })
  @ApiOkResponse({ description: 'Список категорий с количеством рецептов' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Получение информации о категории по slug' })
  @ApiOkResponse({ description: 'Информация о категории' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание новой категории (Администратор)' })
  @ApiCreatedResponse({ description: 'Категория успешно создана' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации полей категории' })
  @ApiConflictResponse({ description: 'Категория с таким именем или slug уже существует' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Редактирование категории по ID (Администратор)' })
  @ApiOkResponse({ description: 'Категория успешно обновлена' })
  @ApiBadRequestResponse({ description: 'Некорректные параметры обновления' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Удаление категории по ID (Администратор)' })
  @ApiOkResponse({ description: 'Категория успешно удалена' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}