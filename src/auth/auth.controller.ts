import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiCreatedResponse({
    description: 'Пользователь успешно зарегистрирован и возвращены токены',
  })
  @ApiBadRequestResponse({ description: 'Ошибка валидации входных данных' })
  @ApiConflictResponse({
    description: 'Пользователь с таким email уже существует',
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Авторизация и получение токенов доступа' })
  @ApiOkResponse({ description: 'Успешная авторизация, выдана пара токенов' })
  @ApiBadRequestResponse({
    description: 'Некорректный формат email или пароля',
  })
  @ApiUnauthorizedResponse({ description: 'Неверные учетные данные' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление пары токенов по refresh token' })
  @ApiOkResponse({ description: 'Токены успешно обновлены' })
  @ApiUnauthorizedResponse({
    description: 'Недействительный или истекший refresh token',
  })
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refreshTokens(
      req.user.id,
      req.user.jti,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы и отзыв активной сессии' })
  @ApiOkResponse({ description: 'Сессия успешно завершена' })
  @ApiUnauthorizedResponse({
    description: 'Токен доступа отсутствует или недействителен',
  })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id, req.user.jti);
    res.clearCookie('refreshToken');
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  @ApiOperation({
    summary: 'Сброс всех активных сессий пользователя (на всех устройствах)',
  })
  @ApiOkResponse({ description: 'Все активные токены отозваны' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);
    res.clearCookie('refreshToken');
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Запрос на восстановление пароля (отправка ссылки/кода)',
  })
  @ApiOkResponse({
    description:
      'Инструкция отправлена на почту (возвращает 200 даже если email не найден)',
  })
  @ApiBadRequestResponse({ description: 'Некорректный формат email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Установка нового пароля по токену сброса' })
  @ApiOkResponse({ description: 'Пароль успешно изменен' })
  @ApiBadRequestResponse({
    description: 'Слабый пароль или невалидный формат запроса',
  })
  @ApiNotFoundResponse({
    description: 'Токен сброса пароля недействителен или истек',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({ summary: 'Смена пароля авторизованного пользователя' })
  @ApiOkResponse({ description: 'Пароль успешно изменен' })
  @ApiBadRequestResponse({
    description: 'Неверный текущий пароль или ошибка валидации',
  })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Пароль успешно изменен' };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });
  }
}
