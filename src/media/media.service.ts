import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.publicUrl = this.configService.getOrThrow<string>('S3_PUBLIC_URL');

    const endpoint = this.configService.getOrThrow<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.configService.getOrThrow<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.getOrThrow<string>('S3_SECRET_KEY');
    const useSSL = this.configService.get<string>('S3_USE_SSL') === 'true';

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
      tls: useSSL,
    });
  }

  /**
   * Извлекает ключ объекта из публичного URL или относительного пути
   * Пример: "http://localhost:9000/recipe-media/recipes/img.webp" -> "recipes/img.webp"
   */
  public extractKeyFromUrl(fileUrlOrKey: string): string | null {
    if (!fileUrlOrKey) return null;

    // Очистка от S3_PUBLIC_URL
    if (fileUrlOrKey.startsWith(this.publicUrl)) {
      const relative = fileUrlOrKey.slice(this.publicUrl.length);
      return relative.startsWith('/') ? relative.slice(1) : relative;
    }

    try {
      if (fileUrlOrKey.startsWith('http://') || fileUrlOrKey.startsWith('https://')) {
        const parsed = new URL(fileUrlOrKey);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments[0] === this.bucketName) {
          segments.shift();
        }
        return segments.join('/');
      }

      const cleanPath = fileUrlOrKey.startsWith('/')
        ? fileUrlOrKey.slice(1)
        : fileUrlOrKey;

      if (cleanPath.startsWith(`${this.bucketName}/`)) {
        return cleanPath.replace(`${this.bucketName}/`, '');
      }

      return cleanPath;
    } catch {
      return fileUrlOrKey;
    }
  }

  /**
   * Удаляет один файл по URL или ключу
   */
  async deleteFile(fileUrlOrKey: string): Promise<boolean> {
    const key = this.extractKeyFromUrl(fileUrlOrKey);
    if (!key) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${key} from S3/MinIO`, error);
      return false;
    }
  }

  /**
   * Удаляет массив файлов пакетным запросом (batch delete)
   */
  async deleteFiles(fileUrlsOrKeys: string[]): Promise<number> {
    const keys = fileUrlsOrKeys
      .map((item) => this.extractKeyFromUrl(item))
      .filter((key): key is string => Boolean(key));

    if (keys.length === 0) return 0;

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      });

      const response = await this.s3Client.send(command);
      const errorsCount = response.Errors?.length || 0;
      const deletedCount = keys.length - errorsCount;

      this.logger.log(`Batch deletion complete: ${deletedCount}/${keys.length} files removed`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to batch delete files from S3/MinIO', error);
      return 0;
    }
  }
}