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
  POSTGRES_URI: Joi.string().uri().optional(),

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
});