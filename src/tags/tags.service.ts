import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subject } from '@casl/ability';
import { PrismaService } from '../prisma/prisma.service';
import { CaslAbilityFactory, Action } from '../casl/casl-ability.factory';
import { QueryTagsDto } from './dto/query-tags.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { slugify } from '../common/utils/slugify.util';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

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

  async create(dto: CreateTagDto, user: CurrentUserData) {
    const ability = this.caslAbilityFactory.createForUser(user);
    if (ability.cannot(Action.Create, 'Tag')) {
      throw new ForbiddenException('Недостаточно прав для создания тегов');
    }

    const slug = slugify(dto.name);
    const existing = await this.prisma.tag.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });

    if (existing) {
      throw new ConflictException(
        'Тег с таким названием или slug уже существует',
      );
    }

    return this.prisma.tag.create({
      data: {
        name: dto.name,
        slug,
      },
    });
  }

  async update(id: string, dto: UpdateTagDto, user: CurrentUserData) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Тег с ID "${id}" не найден`);
    }

    const ability = this.caslAbilityFactory.createForUser(user);
    if (ability.cannot(Action.Update, subject('Tag', tag as any))) {
      throw new ForbiddenException('Недостаточно прав для редактирования тега');
    }

    let slug = tag.slug;
    if (dto.name && dto.name !== tag.name) {
      slug = slugify(dto.name);
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        ...dto,
        slug,
      },
    });
  }

  async remove(id: string, user: CurrentUserData) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Тег с ID "${id}" не найден`);
    }

    const ability = this.caslAbilityFactory.createForUser(user);
    if (ability.cannot(Action.Delete, subject('Tag', tag as any))) {
      throw new ForbiddenException('Недостаточно прав для удаления тега');
    }

    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Тег успешно удален' };
  }
}
