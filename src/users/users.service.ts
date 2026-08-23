import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

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
      throw new NotFoundException('User not found');
    }

    if (dto.username && dto.username !== user.profile?.username) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: dto.username },
      });

      if (existingProfile && existingProfile.userId !== userId) {
        throw new ConflictException('Username is already taken');
      }
    }

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        username: dto.username || `user_${Date.now()}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
      update: {
        ...(dto.username && { username: dto.username }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
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