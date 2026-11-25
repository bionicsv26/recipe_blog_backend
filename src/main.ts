import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  // Swagger документация
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
