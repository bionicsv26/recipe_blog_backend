import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { CaslAbilityFactory, Action } from '../casl/casl-ability.factory';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';

export interface UploadResponse {
  url: string;
  key: string;
  width: number;
  height: number;
}

export interface UploadResult {
  url: string;
  key: string;
}

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {
    this.bucketName = this.configService.get<string>(
      'S3_BUCKET_NAME',
      'recipe-media',
    );
    this.publicUrl = this.configService.get<string>(
      'S3_PUBLIC_URL',
      'http://localhost:9000/recipe-media',
    );

    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>(
        'S3_ENDPOINT',
        'http://localhost:9000',
      ),
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>(
          'S3_ACCESS_KEY',
          'minioadmin',
        ),
        secretAccessKey: this.configService.get<string>(
          'S3_SECRET_KEY',
          'minioadmin',
        ),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  /**
   * Проверка и создание бакета с публичным доступом на чтение
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
    } catch {
      this.logger.warn(`Бакет "${this.bucketName}" не найден. Создание...`);
      await this.s3Client.send(
        new CreateBucketCommand({ Bucket: this.bucketName }),
      );

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(
        `Бакет "${this.bucketName}" успешно создан и сконфигурирован.`,
      );
    }
  }

  /**
   * Оптимизация изображения и сохранение в S3 с проверкой CASL
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: 'temp' | 'recipes' | 'avatars' | 'reviews',
    user: CurrentUserData,
  ): Promise<UploadResponse> {
    const ability = this.caslAbilityFactory.createForUser(user);

    if (ability.cannot(Action.Create, 'Upload')) {
      throw new ForbiddenException('У вас нет прав для загрузки медиафайлов');
    }

    // Обычный пользователь может загружать только во временную директорию или аватары
    if (
      (folder === 'recipes' || folder === 'reviews') &&
      ability.cannot(Action.Manage, 'Upload')
    ) {
      throw new ForbiddenException(
        'Прямая загрузка в данный каталог запрещена',
      );
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Файл не передан');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Разрешены только форматы JPEG, PNG, WEBP, AVIF',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Некорректный размер файла (макс. 5 МБ)');
    }

    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      const processedBuffer = await image
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const key = `${folder}/${randomUUID()}.webp`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: processedBuffer,
          ContentType: 'image/webp',
        }),
      );

      return {
        url: `${this.publicUrl}/${key}`,
        key,
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Ошибка загрузки файла в S3', error);
      throw new InternalServerErrorException(
        'Не удалось сохранить изображение',
      );
    }
  }
}
