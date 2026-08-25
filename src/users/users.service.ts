import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MediaService } from '../media/media.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) { }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // 1. Проверка уникальности username при его смене
    if (dto.username && dto.username !== user.profile?.username) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: dto.username },
      });

      if (existingProfile && existingProfile.userId !== userId) {
        throw new ConflictException('Имя пользователя уже занято');
      }
    }

    let finalAvatarUrl = dto.avatarUrl;
    const oldAvatarUrl = user.profile?.avatarUrl;

    // 2. Если передан новый URL из temp/, переносим в постоянную папку
    if (dto.avatarUrl && dto.avatarUrl.includes('/temp/')) {
      finalAvatarUrl = await this.mediaService.moveToPermanent(
        dto.avatarUrl,
        'avatars',
        userId,
      );
    }

    // 3. Если аватар был изменен или удален (null/undefined) — удаляем старый постоянный файл
    if (oldAvatarUrl && dto.avatarUrl !== undefined && oldAvatarUrl !== finalAvatarUrl) {
      await this.mediaService.deleteFile(oldAvatarUrl);
    }

    // 4. Обновление или создание профиля в БД
    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        username: dto.username || `user_${Date.now()}`,
        bio: dto.bio,
        avatarUrl: finalAvatarUrl,
      },
      update: {
        ...(dto.username && { username: dto.username }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: updatedProfile,
    };
  }
}