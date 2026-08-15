import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';

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
    PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
