import { Controller, Get, Query } from '@nestjs/common';
import { TagsService } from './tags.service';
import { QueryTagsDto } from './dto/query-tags.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) { }

  @Public()
  @Get()
  async findAll(@Query() query: QueryTagsDto) {
    return this.tagsService.findAll(query);
  }

  @Public()
  @Get('popular')
  async findPopular(@Query('limit') limit?: number) {
    return this.tagsService.findPopular(limit ? Number(limit) : 10);
  }
}