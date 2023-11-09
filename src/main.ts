import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { config } from './config/config';

async function bootstrap() {
  const PORT = config.port;
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}
bootstrap();
