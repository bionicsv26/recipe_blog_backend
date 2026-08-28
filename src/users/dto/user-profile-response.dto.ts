import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserProfileDetailsDto {
  @ApiPropertyOptional({ example: 'chef_mario', description: 'Никнейм пользователя' })
  username?: string;

  @ApiPropertyOptional({ example: 'Иван', description: 'Имя' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Иванов', description: 'Фамилия' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'Шеф-повар с 10-летним стажем', description: 'О себе' })
  bio?: string;

  @ApiPropertyOptional({ example: 'https://s3.example.com/avatars/user1.webp', description: 'URL аватара', nullable: true })
  avatarUrl?: string | null;
}

export class CaslRuleDto {
  @ApiProperty({ example: 'manage', description: 'Разрешенное действие' })
  action!: string;

  @ApiProperty({ example: 'Recipe', description: 'Сущность' })
  subject!: string;

  @ApiPropertyOptional({ description: 'Условия применимости правила', type: Object })
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Список доступных полей', type: [String] })
  fields?: string[];

  @ApiPropertyOptional({ description: 'Флаг инверсии правила' })
  inverted?: boolean;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Уникальный ID пользователя' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', description: 'Электронная почта' })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.CHEF, description: 'Системная роль' })
  role!: Role;

  @ApiPropertyOptional({ type: () => UserProfileDetailsDto, description: 'Расширенные данные профиля' })
  profile?: UserProfileDetailsDto | null;

  @ApiProperty({
    type: [CaslRuleDto],
    description: 'Сериализованный массив правил CASL для фронтенда',
  })
  rules!: CaslRuleDto[];
}