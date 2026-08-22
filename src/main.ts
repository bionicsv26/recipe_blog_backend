import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middleware
  app.use(cookieParser());

  // Глобальная валидация DTO через Zod
  app.useGlobalPipes(new ZodValidationPipe());

  // Настройка CORS для взаимодействия с Vue 3
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger документация
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();