import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryTagsDto } from './dto/query-tags.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(query: QueryTagsDto) {
    const { search, limit } = query;

    return this.prisma.tag.findMany({
      where: search
        ? {
          name: { contains: search, mode: 'insensitive' },
        }
        : undefined,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { recipes: true } },
      },
    });
  }

  async findPopular(limit = 10) {
    return this.prisma.tag.findMany({
      take: limit,
      orderBy: {
        recipes: { _count: 'desc' },
      },
      include: {
        _count: { select: { recipes: true } },
      },
    });
  }
}