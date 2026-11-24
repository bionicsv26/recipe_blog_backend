import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Создаем папку uploads, если ее еще нет
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const multerOptions = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      callback(null, UPLOAD_DIR);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const extension = extname(file.originalname).toLowerCase();
      callback(null, `img-${uniqueSuffix}${extension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          'Допустимы только изображения в форматах JPEG, PNG или WEBP',
        ),
        false,
      );
    }
  },
};
