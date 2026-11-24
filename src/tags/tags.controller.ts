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
import { TagsService } from './tags.service';
import { QueryTagsDto } from './dto/query-tags.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/guards/policies.guard';
import { CheckPolicies } from '../casl/decorators/check-policies.decorator';
import { Action, type AppAbility } from '../casl/casl-ability.factory';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Поиск и автодополнение тегов' })
  @ApiOkResponse({
    description: 'Список тегов, удовлетворяющих условиям поиска',
  })
  async findAll(@Query() query: QueryTagsDto) {
    return this.tagsService.findAll(query);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Получение списка наиболее популярных тегов' })
  @ApiOkResponse({ description: 'Список популярных тегов' })
  async findPopular(@Query('limit') limit?: number) {
    return this.tagsService.findPopular(limit ? Number(limit) : 10);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Tag'))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание нового тега (CHEF, MODERATOR, ADMIN)' })
  @ApiCreatedResponse({ description: 'Тег успешно создан' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации структуры тега' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав для создания тега' })
  @ApiConflictResponse({
    description: 'Тег с таким названием или slug уже существует',
  })
  async create(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tagsService.create(dto, user);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Tag'))
  @Patch(':id')
  @ApiOperation({ summary: 'Редактирование тега (MODERATOR, ADMIN)' })
  @ApiOkResponse({ description: 'Тег успешно обновлен' })
  @ApiBadRequestResponse({ description: 'Некорректные параметры обновления' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({
    description: 'Недостаточно прав для редактирования тега',
  })
  @ApiNotFoundResponse({ description: 'Тег не найден' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tagsService.update(id, dto, user);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Tag'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление тега (MODERATOR, ADMIN)' })
  @ApiOkResponse({ description: 'Тег успешно удален' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав для удаления тега' })
  @ApiNotFoundResponse({ description: 'Тег не найден' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tagsService.remove(id, user);
  }
}
