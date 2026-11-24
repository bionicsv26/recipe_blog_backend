import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Recipe Blog API')
    .setDescription(
      'REST API для кулинарного блога с авторизацией, рецептами, категориями, закладками и отзывами',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Введите JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  // 1. Создаем исходный документ Swagger
  const rawDocument = SwaggerModule.createDocument(app, config);

  // 2. Очищаем документ под спецификацию схем nestjs-zod
  const document = cleanupOpenApiDoc(rawDocument);

  // 3. Подключаем Swagger UI и регистрируем JSON/YAML эндпоинты
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    yamlDocumentUrl: 'docs-yaml',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
