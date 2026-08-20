import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { multerOptions } from './uploads.constants';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) { }

  /**
   * Загрузка одного изображения (обложки рецепта или фото шага)
   * POST /uploads/image
   */
  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return this.uploadsService.formatFileUrl(file);
  }
}