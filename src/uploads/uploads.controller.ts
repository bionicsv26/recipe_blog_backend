import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { multerOptions } from './uploads.constants';

@ApiTags('Uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) { }

  /**
   * Загрузка одного изображения (обложки рецепта или фото шага)
   * POST /uploads/image
   */
  @Post('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Загрузка одиночного изображения (обложка, шаг или отзыв)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Изображение успешно сохранено, возвращен URL' })
  @ApiBadRequestResponse({ description: 'Файл не передан или не соответствует разрешенным типам (PNG, JPEG, WEBP)' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return this.uploadsService.formatFileUrl(file);
  }
}