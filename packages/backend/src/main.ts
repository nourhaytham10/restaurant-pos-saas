import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });
  const prefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalFilters(new AllExceptionsFilter());
  if (process.env.NODE_ENV !== 'production') {
    const cfg = new DocumentBuilder().setTitle('Restaurant POS SaaS API').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, cfg));
  }
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}/${prefix}`);
}
bootstrap().catch((e) => { console.error(e); process.exit(1); });
