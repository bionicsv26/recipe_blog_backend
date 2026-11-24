import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subject } from '@casl/ability';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MediaService } from '../media/media.service';
import { CaslAbilityFactory, Action } from '../casl/casl-ability.factory';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  /**
   * Получение профиля (Свой или чужой, если есть права)
   */
  async getProfile(targetUserId: string, currentUser: CurrentUserData) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const ability = this.caslAbilityFactory.createForUser(currentUser);
    if (ability.cannot(Action.Read, subject('User', user as any))) {
      throw new ForbiddenException(
        'У вас нет прав для просмотра этого профиля',
      );
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Получение только публичной информации (Для авторов рецептов)
   */
  async getPublicProfile(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        profile: {
          select: {
            username: true,
            avatarUrl: true,
            bio: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  /**
   * Обновление профиля с проверкой CASL
   */
  async updateProfile(
    targetUserId: string,
    dto: UpdateProfileDto,
    currentUser: CurrentUserData,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const ability = this.caslAbilityFactory.createForUser(currentUser);
    if (ability.cannot(Action.Update, subject('User', user as any))) {
      throw new ForbiddenException(
        'У вас нет прав на редактирование этого профиля',
      );
    }

    if (dto.username && dto.username !== user.profile?.username) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: dto.username },
      });

      if (existingProfile && existingProfile.userId !== targetUserId) {
        throw new ConflictException('Имя пользователя уже занято');
      }
    }

    let finalAvatarUrl = dto.avatarUrl;
    const oldAvatarUrl = user.profile?.avatarUrl;

    if (dto.avatarUrl && dto.avatarUrl.includes('/temp/')) {
      finalAvatarUrl = await this.mediaService.moveToPermanent(
        dto.avatarUrl,
        'avatars',
        targetUserId,
      );
    }

    if (
      oldAvatarUrl &&
      dto.avatarUrl !== undefined &&
      oldAvatarUrl !== finalAvatarUrl
    ) {
      await this.mediaService.deleteFile(oldAvatarUrl);
    }

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        username: dto.username || `user_${Date.now()}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        avatarUrl: finalAvatarUrl,
      },
      update: {
        ...(dto.username && { username: dto.username }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
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
