import { PrismaClient, Role, Difficulty } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Очистка базы данных...');
  await prisma.reviewImage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.recipeCategory.deleteMany();
  await prisma.recipeStep.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeImage.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Создание пользователей...');
  const passwordHash = await argon2.hash('Password123');

  // 1. Администратор
  const admin = await prisma.user.create({
    data: {
      email: 'admin@recipeblog.dev',
      passwordHash,
      role: Role.ADMIN,
      profile: {
        create: {
          username: 'admin',
          bio: 'Главный редактор кулинарного портала',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
      },
    },
  });

  // 2. Шеф-повар (Автор рецептов)
  const chef = await prisma.user.create({
    data: {
      email: 'chef@recipeblog.dev',
      passwordHash,
      role: Role.USER,
      profile: {
        create: {
          username: 'chef_mario',
          bio: 'Шеф-повар с 10-летним стажем. Люблю классическую итальянскую кухню.',
          avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150',
        },
      },
    },
  });

  // 3. Обычный пользователь (Читатель)
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@recipeblog.dev',
      passwordHash,
      role: Role.USER,
      profile: {
        create: {
          username: 'anna_foodie',
          bio: 'Любитель готовить дома и пробовать новые десерты.',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        },
      },
    },
  });

  console.log('📂 Создание категорий...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Паста и ризотто',
        slug: 'pasta-and-risotto',
        description: 'Традиционные итальянские блюда из пасты и риса',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Десерты и выпечка',
        slug: 'desserts-and-baking',
        description: 'Сладкие торты, пирожные и домашняя выпечка',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Супы',
        slug: 'soups',
        description: 'Горячие и холодные супы со всего мира',
      },
    }),
  ]);

  console.log('🏷️ Создание тегов...');
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'Итальянская кухня', slug: 'italian' } }),
    prisma.tag.create({ data: { name: 'Быстрый ужин', slug: 'quick-dinner' } }),
    prisma.tag.create({ data: { name: 'Вегетарианское', slug: 'vegetarian' } }),
    prisma.tag.create({ data: { name: 'Праздничный стол', slug: 'holiday' } }),
  ]);

  console.log('🍳 Создание рецептов...');

  // Рецепт 1: Карбонара
  const carbonara = await prisma.recipe.create({
    data: {
      title: 'Классическая Римская Карбонара',
      slug: 'klassicheskaya-rimskaya-karbonara',
      description: 'Аутентичный рецепт без сливок: только гуанчиале, желтки и сыр Пекорино Романо.',
      coverImageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      difficulty: Difficulty.EASY,
      isPublished: true,
      viewsCount: 142,
      authorId: chef.id,
      categories: {
        create: [{ categoryId: categories[0].id }],
      },
      tags: {
        create: [
          { tagId: tags[0].id },
          { tagId: tags[1].id },
        ],
      },
      ingredients: {
        create: [
          { name: 'Спагетти', amount: '200', unit: 'г', order: 1 },
          { name: 'Гуанчиале (или панчетта)', amount: '100', unit: 'г', order: 2 },
          { name: 'Яичные желтки', amount: '3', unit: 'шт', order: 3 },
          { name: 'Сыр Пекорино Романо', amount: '50', unit: 'г', order: 4 },
          { name: 'Свежемолотый черный перец', amount: '1', unit: 'ч. л.', order: 5 },
        ],
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            instruction: 'В глубокой миске взбейте желтки с тертым сыром Пекорино и щедрой порцией черного перца.',
          },
          {
            stepNumber: 2,
            instruction: 'Нарежьте гуанчиале брусочками и обжарьте на среднем огне до хрустящей корочки. Снимите сковороду с огня.',
          },
          {
            stepNumber: 3,
            instruction: 'Отварите спагетти в подсоленной воде до состояния al dente. Переложите пасту к мясу, затем вмешайте яичную смесь с небольшим количеством воды от варки.',
          },
        ],
      },
    },
  });

  // Рецепт 2: Тирамису
  const tiramisu = await prisma.recipe.create({
    data: {
      title: 'Нежный домашний Тирамису',
      slug: 'nezhnyy-domashniy-tiramisu',
      description: 'Воздушный кофейный десерт с маскарпоне и печеньем савоярди.',
      coverImageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
      prepTime: 25,
      cookTime: 0,
      servings: 6,
      difficulty: Difficulty.MEDIUM,
      isPublished: true,
      viewsCount: 89,
      authorId: chef.id,
      categories: {
        create: [{ categoryId: categories[1].id }],
      },
      tags: {
        create: [
          { tagId: tags[0].id },
          { tagId: tags[3].id },
        ],
      },
      ingredients: {
        create: [
          { name: 'Маскарпоне', amount: '500', unit: 'г', order: 1 },
          { name: 'Печенье Савоярди', amount: '200', unit: 'г', order: 2 },
          { name: 'Свежесваренный эспрессо', amount: '250', unit: 'мл', order: 3 },
          { name: 'Куриные яйца', amount: '4', unit: 'шт', order: 4 },
          { name: 'Сахарная пудра', amount: '100', unit: 'г', order: 5 },
          { name: 'Какао-порошок', amount: '2', unit: 'ст. л.', order: 6 },
        ],
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            instruction: 'Взбейте желтки с сахарной пудрой, добавьте маскарпоне, затем аккуратно введите взбитые белки.',
          },
          {
            stepNumber: 2,
            instruction: 'Быстро обмакивайте савоярди в кофе и выкладывайте слоями в форму, чередуя с кремом.',
          },
          {
            stepNumber: 3,
            instruction: 'Уберите десерт в холодильник минимум на 4 часа. Перед подачей щедро посыпьте какао-порошком.',
          },
        ],
      },
    },
  });

  console.log('⭐ Добавление отзывов...');

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Получилось идеально с первого раза! Главное — не перегреть желтки на сковороде.',
      userId: regularUser.id,
      recipeId: carbonara.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600',
            order: 1,
          },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      rating: 4,
      comment: 'Отличный базовый рецепт. Я добавляю чуть больше пекорино.',
      userId: admin.id,
      recipeId: carbonara.id,
    },
  });

  await prisma.recipe.update({
    where: { id: carbonara.id },
    data: {
      averageRating: 4.5,
      ratingsCount: 2,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Самый вкусный тирамису! Крем очень стабильный и нежный.',
      userId: regularUser.id,
      recipeId: tiramisu.id,
    },
  });

  await prisma.recipe.update({
    where: { id: tiramisu.id },
    data: {
      averageRating: 5.0,
      ratingsCount: 1,
    },
  });

  console.log('❤️ Добавление в избранное...');
  await prisma.favorite.create({
    data: {
      userId: regularUser.id,
      recipeId: carbonara.id,
    },
  });

  await prisma.favorite.create({
    data: {
      userId: admin.id,
      recipeId: tiramisu.id,
    },
  });

  console.log('✅ Сидирование базы данных успешно завершено!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });