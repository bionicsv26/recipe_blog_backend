import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from './media.service';

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) { }

  // Запуск каждый день в 03:00 ночи
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanupOrphanFiles(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Previous cleanup job is still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting orphan files cleanup task...');

    try {
      // 1. Получаем все объекты из MinIO
      const s3Objects = await this.mediaService.listAllObjects();
      if (s3Objects.length === 0) {
        this.logger.log('No objects found in storage.');
        return;
      }

      // 2. Собираем все используемые URL из базы данных
      const [profiles, recipes, steps, categories, recipeImages, reviewImages] = await Promise.all([
        this.prisma.profile.findMany({
          where: { avatarUrl: { not: null } },
          select: { avatarUrl: true },
        }),
        this.prisma.recipe.findMany({
          where: { coverImageUrl: { not: null } },
          select: { coverImageUrl: true },
        }),
        this.prisma.recipeStep.findMany({
          where: { imageUrl: { not: null } },
          select: { imageUrl: true },
        }),
        this.prisma.category.findMany({
          where: { imageUrl: { not: null } },
          select: { imageUrl: true },
        }),
        this.prisma.recipeImage.findMany({
          select: { url: true },
        }),
        this.prisma.reviewImage.findMany({
          select: { url: true },
        }),
      ]);

      const usedKeys = new Set<string>();

      profiles.forEach((p) => {
        const key = this.mediaService.extractKeyFromUrl(p.avatarUrl!);
        if (key) usedKeys.add(key);
      });

      recipes.forEach((r) => {
        const key = this.mediaService.extractKeyFromUrl(r.coverImageUrl!);
        if (key) usedKeys.add(key);
      });

      steps.forEach((s) => {
        const key = this.mediaService.extractKeyFromUrl(s.imageUrl!);
        if (key) usedKeys.add(key);
      });

      categories.forEach((c) => {
        const key = this.mediaService.extractKeyFromUrl(c.imageUrl!);
        if (key) usedKeys.add(key);
      });

      recipeImages.forEach((img) => {
        const key = this.mediaService.extractKeyFromUrl(img.url);
        if (key) usedKeys.add(key);
      });

      reviewImages.forEach((img) => {
        const key = this.mediaService.extractKeyFromUrl(img.url);
        if (key) usedKeys.add(key);
      });

      // 3. Отбираем файлы старше 24 часов, отсутствующие в БД
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      const orphanKeysToDelete: string[] = s3Objects
        .filter((obj) => {
          if (usedKeys.has(obj.key)) return false;

          // Проверка возраста файла (не трогаем загружаемые в данный момент)
          const fileAge = obj.lastModified ? now - obj.lastModified.getTime() : oneDayMs + 1;
          return fileAge > oneDayMs;
        })
        .map((obj) => obj.key);

      if (orphanKeysToDelete.length === 0) {
        this.logger.log('No orphan files to clean up.');
        return;
      }

      this.logger.log(`Found ${orphanKeysToDelete.length} orphan files. Deleting...`);

      // 4. Пакетное удаление
      const deletedCount = await this.mediaService.deleteFiles(orphanKeysToDelete);
      this.logger.log(`Cleanup finished: ${deletedCount} orphan files successfully removed.`);
    } catch (error) {
      this.logger.error('Error occurred during orphan files cleanup', error);
    } finally {
      this.isRunning = false;
    }
  }
}