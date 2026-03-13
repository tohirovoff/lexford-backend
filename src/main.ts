// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Payload hajmini oshirish (rasmlar base64 da katta bo'ladi)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // === CORS ni yoqish – MUHIM! ===
  app.enableCors({
    origin: true, // Hamma origindan ruxsat beradi
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // FormData file upload uchun false bo'lishi kerak
      transform: true,
    }),
  );

  // Port – aniq 3000 qilish tavsiya etiladi (Next.js bilan to'qnashmasligi uchun)
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend ishlayapti: http://localhost:${port}`);
}
bootstrap();
