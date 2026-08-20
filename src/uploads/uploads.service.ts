import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) { }

  formatFileUrl(file?: Express.Multer.File): { url: string; filename: string; size: number } {
    if (!file) {
      throw new BadRequestException('Файл не был передан');
    }

    const appPort = this.configService.get<number>('PORT', 3000);
    const host = this.configService.get<string>('APP_URL') || `http://localhost:${appPort}`;

    return {
      url: `${host}/static/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }
}