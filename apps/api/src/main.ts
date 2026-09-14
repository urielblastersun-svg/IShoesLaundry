import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const prefijo = process.env.API_PREFIX;
  if (prefijo) {
    app.setGlobalPrefix(prefijo);
  }

  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  if ((process.env.UPLOAD_DRIVER ?? 'local') === 'local') {
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir);
    }
    app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads' });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API lista en http://localhost:${port}${prefijo ? '/' + prefijo : ''}`);
}
await bootstrap();