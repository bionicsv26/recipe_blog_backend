import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { slugify } from '../common/utils/slugify.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            recipes: {
              where: { recipe: { isPublished: true } },
            },
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            recipes: {
              where: { recipe: { isPublished: true } },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Категория "${slug}" не найдена`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.category.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });

    if (existing) {
      throw new ConflictException('Категория с таким названием или slug уже существует');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        order: dto.order,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = slugify(dto.name);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
        slug,
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Категория успешно удалена' };
  }
}