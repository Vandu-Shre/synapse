import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useWebSocketAdapter(new WsAdapter(app));
  
  app.enableCors({
    origin: 'http://localhost:3000',
  })

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
