import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) { }

  @Get('profile')
  @ApiOperation({ summary: 'Получение профиля текущего пользователя и правил CASL' })
  @ApiOkResponse({
    description: 'Данные профиля и массив правил авторизации',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async getProfile(@Req() req: { user: { id: string; role: any } }) {
    const user = await this.usersService.getProfile(req.user.id);

    const ability = this.caslAbilityFactory.createForUser({
      id: user.id,
      role: user.role,
    });

    return {
      ...user,
      rules: ability.rules,
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Обновление данных профиля' })
  @ApiOkResponse({
    description: 'Профиль успешно обновлен',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  async updateProfile(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}