import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { CurrentUser, type CurrentUserData } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  /**
   * Публичный профиль
   * GET /users/:id/public
   */
  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Получение публичного профиля автора/пользователя' })
  @ApiOkResponse({ description: 'Публичная информация' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  async getPublicProfile(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.getPublicProfile(id);
  }

  /**
   * Свой профиль
   * GET /users/me
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Получение профиля текущего пользователя и правил CASL' })
  @ApiOkResponse({
    description: 'Данные профиля и массив правил авторизации',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async getMyProfile(@CurrentUser() user: CurrentUserData) {
    const profileData = await this.usersService.getProfile(user.id, user);
    const ability = this.caslAbilityFactory.createForUser(user);

    return {
      ...profileData,
      rules: ability.rules,
    };
  }

  /**
   * Обновление своего профиля
   * PATCH /users/me
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Обновление данных своего профиля' })
  @ApiOkResponse({
    description: 'Профиль успешно обновлен',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async updateMyProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto, user);
  }

  /**
   * Чужой профиль (ADMIN/MODERATOR)
   * GET /users/:id
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Получение приватного профиля по ID (Модератор/Админ)' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async getUserProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.usersService.getProfile(id, user);
  }

  /**
   * Обновление чужого профиля (ADMIN)
   * PATCH /users/:id
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Обновление чужого профиля по ID (Админ)' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  async updateUserProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.usersService.updateProfile(id, dto, user);
  }
}