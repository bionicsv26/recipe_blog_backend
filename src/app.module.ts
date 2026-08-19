import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CaslModule } from './casl/casl.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true, // разрешает системные переменные ОС
        abortEarly: false,  // выводит сразу весь список ошибок валидации при старте
      },
      expandVariables: true, // включает интерполяцию переменных вида ${POSTGRES_USER}
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 секунд (в миллисекундах)
        limit: 60,  // 60 запросов в минуту
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    CaslModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 1. Сначала отрабатывает ThrottlerGuard (отсекает спам до парсинга токенов)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 2. Затем JwtAuthGuard проверяет авторизацию
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
