import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtPayload, JwtRefreshPayload } from './interfaces/jwt-payload.interface';
import { AuthTokens } from './interfaces/tokens.interface';
import { Role } from '@prisma/client';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) { }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.username) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: dto.username },
      });
      if (existingProfile) {
        throw new ConflictException('Username is already taken');
      }
    }

    const passwordHash = await argon2.hash(dto.password);
    const username = dto.username || `user_${Date.now()}`;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: {
          create: {
            username,
            bio: dto.bio,
          },
        },
      },
    });

    // Отправка приветственного письма (асинхронно)
    await this.mailService.sendWelcomeEmail(user.email, username);

    return this.generateAndSaveTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAndSaveTokens(user.id, user.email, user.role);
  }

  async refreshTokens(userId: string, jti: string): Promise<AuthTokens> {
    const isValid = await this.redisService.isRefreshTokenValid(userId, jti);
    if (!isValid) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    // Инвалидируем старый токен (Token Rotation)
    await this.redisService.invalidateRefreshToken(userId, jti);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer exists or is inactive');
    }

    return this.generateAndSaveTokens(user.id, user.email, user.role);
  }

  async logout(userId: string, jti: string): Promise<void> {
    await this.redisService.invalidateRefreshToken(userId, jti);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.redisService.invalidateAllUserSessions(userId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    // Безопасный ответ: не раскрываем, существует ли такой email в базе
    if (!user || !user.isActive) {
      return {
        message: 'If this email exists, a password reset link has been sent.',
      };
    }

    // 1. Генерация безопасного случайного токена
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Сохранение токена в Redis на 15 минут (900 секунд)
    await this.redisService.savePasswordResetToken(user.id, resetToken, 900);

    // 3. Отправка письма с шаблоном Handlebars
    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.profile?.username,
    );

    return {
      message: 'If this email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const userId = await this.redisService.getUserIdByPasswordResetToken(dto.token);

    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    // 1. Обновляем пароль в базе
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // 2. Удаляем использованный токен сброса
    await this.redisService.invalidatePasswordResetToken(dto.token);

    // 3. Завершаем все активные сессии на всех устройствах
    await this.redisService.invalidateAllUserSessions(userId);

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  private async generateAndSaveTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthTokens> {
    const tokenId = uuidv4();
    const payload: JwtPayload = { sub: userId, email, role };
    const refreshPayload: JwtRefreshPayload = { ...payload, jti: tokenId };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessExpiration = Number(this.configService.get<number>('JWT_ACCESS_EXPIRATION', 900));

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpiration = Number(this.configService.get<number>('JWT_REFRESH_EXPIRATION', 604800));

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiration,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration,
      }),
    ]);

    await this.redisService.saveRefreshToken(userId, tokenId, refreshExpiration);

    return { accessToken, refreshToken };
  }
}