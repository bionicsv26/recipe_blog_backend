import { Difficulty, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with categories and tags...');

  // Очистка таблиц в порядке зависимостей
  await prisma.recipeTag.deleteMany();
  await prisma.recipeCategory.deleteMany();
  await prisma.recipeStep.deleteMany();
  await prisma.recipeImage.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await argon2.hash('Password123');

  // 1. Пользователи
  const admin = await prisma.user.create({
    data: {
      email: 'admin@recipeblog.dev',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      profile: {
        create: {
          username: 'admin_chef',
          bio: 'System Administrator and Food Critic',
        },
      },
    },
  });

  const chef = await prisma.user.create({
    data: {
      email: 'chef@recipeblog.dev',
      passwordHash: defaultPassword,
      role: Role.CHEF,
      profile: {
        create: {
          username: 'gordon_r',
          bio: 'Passionate Italian cuisine chef',
        },
      },
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@recipeblog.dev',
      passwordHash: defaultPassword,
      role: Role.USER,
      profile: {
        create: {
          username: 'home_cook',
          bio: 'Beginner cook looking for easy dinners',
        },
      },
    },
  });

  // 2. Базовые категории
  const categoriesData = [
    { name: 'Завтраки', slug: 'zavtraki', description: 'Блюда для идеального начала дня', order: 1 },
    { name: 'Основные блюда', slug: 'osnovnye-blyuda', description: 'Сытные горячие обеды и ужины', order: 2 },
    { name: 'Супы', slug: 'supy', description: 'Согревающие первые блюда', order: 3 },
    { name: 'Десерты и выпечка', slug: 'deserty-i-vypechka', description: 'Сладкие угощения к чаю', order: 4 },
    { name: 'Салаты и закуски', slug: 'salaty-i-zakuski', description: 'Легкие и свежие блюда', order: 5 },
  ];

  const categories = await Promise.all(
    categoriesData.map((cat) => prisma.category.create({ data: cat })),
  );

  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));

  // 3. Базовые теги
  const tagsData = [
    { name: 'быстро', slug: 'bystro' },
    { name: 'итальянская кухня', slug: 'italyanskaya-kuhnya' },
    { name: 'вегетарианское', slug: 'vegetarianskoe' },
    { name: 'без сахара', slug: 'bez-sahara' },
    { name: 'пп', slug: 'pp' },
    { name: 'для начинающих', slug: 'dlya-nachinayushchih' },
  ];

  const tags = await Promise.all(
    tagsData.map((tag) => prisma.tag.create({ data: tag })),
  );

  const tagMap = new Map(tags.map((t) => [t.slug, t.id]));

  // 4. Рецепт 1: Опубликованная Карбонара
  await prisma.recipe.create({
    data: {
      title: 'Классическая паста Карбонара',
      slug: 'classic-pasta-carbonara',
      description: 'Традиционный римский рецепт пасты с гуанчале и пекорино романо.',
      coverImageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3',
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      difficulty: Difficulty.MEDIUM,
      isPublished: true,
      authorId: chef.id,
      categories: {
        create: [
          { categoryId: categoryMap.get('osnovnye-blyuda')! },
        ],
      },
      tags: {
        create: [
          { tagId: tagMap.get('italyanskaya-kuhnya')! },
          { tagId: tagMap.get('bystro')! },
        ],
      },
      ingredients: {
        create: [
          { name: 'Спагетти', amount: 400, unit: 'г', order: 1 },
          { name: 'Гуанчале или панчетта', amount: 150, unit: 'г', order: 2 },
          { name: 'Свежие яичные желтки', amount: 4, unit: 'шт', order: 3 },
          { name: 'Сыр Пекорино Романо', amount: 50, unit: 'г', order: 4 },
          { name: 'Свежемолотый черный перец', amount: 5, unit: 'г', note: 'по вкусу', order: 5 },
        ],
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            instruction: 'Поставьте вариться спагетти в подсоленной воде до состояния аль денте.',
          },
          {
            stepNumber: 2,
            instruction: 'Нарежьте гуанчале брусочками и обжарьте на среднем огне до хрустящей корочки.',
          },
          {
            stepNumber: 3,
            instruction: 'Смешайте желтки с натертым сыром пекорино и щедрой порцией черного перца.',
          },
          {
            stepNumber: 4,
            instruction: 'Соедините горячую пасту с мясом, снимите с огня и быстро вмешайте яично-сырный соус.',
          },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3',
            caption: 'Готовая паста карбонара',
            order: 1,
          },
        ],
      },
    },
  });

  // 5. Рецепт 2: Черновик Тирамису
  await prisma.recipe.create({
    data: {
      title: 'Секретный десерт Тирамису (Черновик)',
      slug: 'secret-tiramisu-draft',
      description: 'Экспериментальный рецепт нежного кофейного десерта.',
      prepTime: 20,
      cookTime: 0,
      servings: 6,
      difficulty: Difficulty.MEDIUM,
      isPublished: false,
      authorId: chef.id,
      categories: {
        create: [
          { categoryId: categoryMap.get('deserty-i-vypechka')! },
        ],
      },
      tags: {
        create: [
          { tagId: tagMap.get('italyanskaya-kuhnya')! },
        ],
      },
      ingredients: {
        create: [
          { name: 'Печенье Савоярди', amount: 200, unit: 'г', order: 1 },
          { name: 'Сыр Маскарпоне', amount: 250, unit: 'г', order: 2 },
          { name: 'Эспрессо', amount: 150, unit: 'мл', order: 3 },
        ],
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            instruction: 'Сварите крепкий кофе эспрессо и дайте ему полностью остыть.',
          },
          {
            stepNumber: 2,
            instruction: 'Взбейте маскарпоне с кремом до устойчивой однородной текстуры.',
          },
        ],
      },
    },
  });

  // 6. Рецепт 3: Черновик Омлета
  await prisma.recipe.create({
    data: {
      title: 'Простой омлет на завтрак',
      slug: 'simple-breakfast-omelette',
      description: 'Быстрый омлет за 5 минут.',
      prepTime: 2,
      cookTime: 5,
      servings: 1,
      difficulty: Difficulty.EASY,
      isPublished: false,
      authorId: user.id,
      categories: {
        create: [
          { categoryId: categoryMap.get('zavtraki')! },
        ],
      },
      tags: {
        create: [
          { tagId: tagMap.get('bystro')! },
          { tagId: tagMap.get('dlya-nachinayushchih')! },
        ],
      },
      ingredients: {
        create: [
          { name: 'Яйца куриные', amount: 3, unit: 'шт', order: 1 },
          { name: 'Молоко', amount: 50, unit: 'мл', order: 2 },
          { name: 'Сливочное масло', amount: 10, unit: 'г', order: 3 },
        ],
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            instruction: 'Взбейте яйца венчиком вместе с молоком и щепоткой соли.',
          },
          {
            stepNumber: 2,
            instruction: 'Растопите сливочное масло на сковороде и вылейте яичную смесь. Готовьте 3-5 минут.',
          },
        ],
      },
    },
  });

  console.log('✅ Seed completed successfully with Categories and Tags:');
  console.log(`- Created ${categories.length} categories`);
  console.log(`- Created ${tags.length} tags`);
  console.log(`- Created 3 seeded recipes linked with relations`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });