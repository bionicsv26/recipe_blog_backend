import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { QueryTagsDto } from './dto/query-tags.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Поиск и автодополнение тегов' })
  @ApiOkResponse({ description: 'Список тегов, удовлетворяющих условиям поиска' })
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
}