# Recipe Blog Backend API

RESTful API сервис для кулинарного блога с поддержкой авторизации, управления рецептами, категориями, тегами, избранным, отзывами и загрузкой медиафайлов.

---

## Технологический стек

* **Runtime & Framework:** Node.js, NestJS
* **Database & ORM:** PostgreSQL, Prisma ORM
* **Cache & Sessions:** Redis
* **Storage (S3):** MinIO / AWS S3 SDK (`@aws-sdk/client-s3`), Sharp (оптимизация изображений в WebP)
* **Auth & Security:** JWT (Access & Refresh tokens), Argon2, CASL (`@casl/ability` для RBAC/ABAC)
* **Validation & DTO:** Zod, `nestjs-zod`
* **Documentation:** Swagger / OpenAPI
* **Testing:** Jest, Supertest

---

## Архитектура ролей и прав (CASL)

В системе реализовано разграничение доступа на базе ролей и атрибутов (RBAC/ABAC):

* **USER**: чтение опубликованных рецептов, создание и редактирование своих отзывов, управление своим списком избранного, загрузка аватара и временных файлов (`temp`).
* **CHEF**: создание и редактирование собственных рецептов/черновиков, добавление тегов, прямое управление медиафайлами рецептов.
* **MODERATOR**: модерация и удаление любых рецептов и отзывов, управление тегами, создание категорий.
* **ADMIN**: полный доступ ко всем ресурсам (`manage: all`), управление ролями пользователей, удаление файлов из S3.

---

## Предварительные требования

* **Node.js**: `>= 20.x`
* **Docker & Docker Compose** (для локального запуска PostgreSQL, Redis и MinIO)
* **pnpm** / **npm** / **yarn**

---

## Быстрый старт

### 1. Клонирование репозитория и установка зависимостей

```bash
git clone <repository-url>
cd recipe-blog-backend
npm install
```

### 2. Настройка переменных окружения

Создайте файл .env в корневой директории на основе примера:

```env
# Server
NODE_ENV=development

# Database (PostgreSQL)
POSTGRES_USER=root
POSTGRES_PASSWORD=123456789
POSTGRES_HOST=localhost
POSTGRES_DB=recipe-blog
POSTGRES_PORT=5434
POSTGRES_URI="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=876543210

# JWT Secrets
JWT_ACCESS_SECRET="your-super-secret-access-key-change-in-production"
JWT_ACCESS_EXPIRATION=900

JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_REFRESH_EXPIRATION=604800

# Mail configuration (SMTP)
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=свой_адрес@mail.ru
SMTP_PASSWORD=5MhTOVXKqoV3eKAhmkpK265
SMTP_FROM="Recipe Blog <свой_адрес@mail.ru>"
FRONTEND_URL="http://localhost:5173"

# S3 / MinIO Storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=recipe-media
S3_PUBLIC_URL=http://localhost:9000/recipe-media
```

### 3. Запуск инфраструктуры (Docker)

```bash
docker-compose --profile with-redis up -d
```

### 4. Применение миграций базы данных

```bash
# Генерация Prisma Client
npx prisma generate
# Применение миграций к БД
npx prisma migrate dev
```

### 5. Запуск приложения

```bash
# Режим разработки
npm run start:dev

# Продакшн сборка
npm run build
npm run start:prod
```

---

## API Документация (Swagger)

После запуска сервера интерактивная документация Swagger доступна по адресу:

<http://localhost:3000/api/docs>

---

## Структура модулей

```
src/
├── auth/            # Аутентификация, JWT стратегии, Redis сессии
├── casl/            # Фабрика правил доступа (CaslAbilityFactory, PoliciesGuard)
├── categories/      # Категории блюд (CRUD, slugify, иерархия)
├── common/          # Декораторы (@CurrentUser, @Public), интерцепторы, утилиты
├── favorites/       # Закладки и избранные рецепты
├── media/           # Вспомогательный сервис работы с S3/MinIO
├── prisma/          # Модуль подключения и сервиса Prisma ORM
├── recipes/         # Управление рецептами, шагами, ингредиентами
├── reviews/         # Отзывы и рейтинги к рецептам
├── tags/            # Теги и автодополнение
├── uploads/         # Обработка и конвертация изображений через Sharp в S3
└── users/           # Управление профилями и ролями пользователей
```

---

## Тестирование (в проекте)

```bash
# Запуск unit-тестов
npm run test

# Запуск e2e тестов
npm run test:e2e

# Покрытие тестами
npm run test:cov
```