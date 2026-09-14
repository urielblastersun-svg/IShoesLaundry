import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { Storage } from '@google-cloud/storage';
import { AlmacenFotos } from '../common/enums.js';

export interface ResultadoSubida {
  url: string;
  almacenEn: AlmacenFotos;
}

export interface ArchivoSubida {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export type DriverStorage = 'local' | 'gcs';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: DriverStorage;
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;
  private gcs?: Storage;
  private readonly gcsBucket?: string;

  constructor(private readonly config: ConfigService) {
    this.driver = (config.get<string>('UPLOAD_DRIVER') ?? 'local') as DriverStorage;
    this.uploadDir = config.get<string>('UPLOAD_DIR') ?? 'uploads';
    this.publicBaseUrl = (config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    this.gcsBucket = config.get<string>('GCS_BUCKET') || undefined;
  }

  async onModuleInit() {
    if (this.driver === 'local') {
      await mkdir(this.uploadDir, { recursive: true });
    } else {
      const keyfile = this.config.get<string>('GCS_KEYFILE');
      if (!this.gcsBucket) {
        throw new Error('Storage GCS requiere GCS_BUCKET');
      }
      this.gcs = new Storage(keyfile ? { keyFilename: keyfile } : {});
      this.logger.log(`Conectado a bucket GCS ${this.gcsBucket}`);
    }
  }

  async upload(file: ArchivoSubida): Promise<ResultadoSubida> {
    const ext = extname(file.originalname) || '.jpg';
    const nombre = `${Date.now()}-${randomUUID()}${ext}`;

    if (this.driver === 'gcs') {
      if (!this.gcs || !this.gcsBucket) {
        throw new Error('Storage GCS no inicializado');
      }
      const bucket = this.gcs.bucket(this.gcsBucket);
      const destino = `fotos/${nombre}`;
      await bucket.file(destino).save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
      });
      const url = `https://storage.googleapis.com/${this.gcsBucket}/${destino}`;
      return { url, almacenEn: AlmacenFotos.GCS };
    }

    const ruta = join(this.uploadDir, nombre);
    await writeFile(ruta, file.buffer);
    const url = `${this.publicBaseUrl}/uploads/${nombre}`;
    return { url, almacenEn: AlmacenFotos.LOCAL };
  }

  async existeLocal(rutaRelativa: string): Promise<boolean> {
    try {
      await access(join(this.uploadDir, rutaRelativa));
      return true;
    } catch {
      return false;
    }
  }
}