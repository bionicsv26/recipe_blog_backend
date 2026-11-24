import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Приложение
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // PostgreSQL
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().port().default(5434),
  POSTGRES_DB: Joi.string().required(),
  // Prisma читает именно эту переменную (schema.prisma: env("POSTGRES_URI")).
  // Раньше была optional: валидация проходила, а падение случалось позже.
  POSTGRES_URI: Joi.string().uri().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('', null).optional(),

  // JWT Access Token
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRATION: Joi.number().positive().default(900), // 15 минут в секундах

  // JWT Refresh Token
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRATION: Joi.number().positive().default(604800), // 7 дней в секундах

  // Mail
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().port().default(1025),
  SMTP_USER: Joi.string().allow('', null).optional(),
  SMTP_PASSWORD: Joi.string().allow('', null).optional(),
  // Допустим формат с отображаемым именем: "Recipe Blog <noreply@example.com>",
  // поэтому НЕ валидируем как email.
  SMTP_FROM: Joi.string()
    .min(3)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().required(),
      otherwise: Joi.string().default('noreply@recipeblog.dev'),
    }),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // S3 / MinIO
  // MediaService читает их через getOrThrow, а UploadsService и S3HealthIndicator
  // молча подставляли дефолты minioadmin. Теперь опечатка в имени переменной
  // даёт "is required" на старте вместо тихого отказа на первом запросе.
  S3_ENDPOINT: Joi.string().uri().required(),
  S3_BUCKET_NAME: Joi.string().min(3).max(63).required(),
  S3_PUBLIC_URL: Joi.string().uri().required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_REGION: Joi.string().default('us-east-1'),
  // Строка, не boolean: MediaService сравнивает значение со строкой 'true'.
  // Перевод в boolean — только вместе с правкой MediaService (PR9).
  S3_USE_SSL: Joi.string().valid('true', 'false').default('false'),
  S3_TEST_BUCKET_NAME: Joi.string().default('recipe-media-test'),
});
