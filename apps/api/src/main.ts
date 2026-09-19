import './env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (
    !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64 ||
    !process.env.ADMIN_PASSWORD || !process.env.POSTGRES_PASSWORD ||
    !process.env.TRACKING_OTP_SECRET || process.env.TRACKING_OTP_SECRET.length < 32
  )) throw new Error('Production requires strong JWT, admin, database, and tracking OTP secrets');

  const uploadDirectory = process.env.UPLOAD_DIRECTORY || 'uploads';
  mkdirSync(uploadDirectory, { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useStaticAssets(uploadDirectory, { prefix: '/uploads/' });
  await app.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1');
}
bootstrap();
