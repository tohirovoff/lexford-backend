// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // === CORS ni yoqish – MUHIM! ===
  app.enableCors({
    origin: 'http://localhost:3001', // Frontend portingiz (Next.js odatda 3001 ga o'tadi)
    credentials: true, // JWT token yoki cookie ishlatilsa kerak
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // Yoki development uchun oddiyroq variant:
  // app.enableCors(); // Hamma origindan ruxsat beradi (faqat dev uchun!)

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Port – aniq 3000 qilish tavsiya etiladi (Next.js bilan to'qnashmasligi uchun)
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend ishlayapti: http://localhost:${port}`);
}
bootstrap();
