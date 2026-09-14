import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Rol } from '../common/enums.js';
import { StorageService } from './storage.service.js';

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @Roles(Rol.DESPACHADOR, Rol.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile()
    file?: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió archivo');
    }
    const { storage } = this;
    return storage.upload({
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });
  }
}