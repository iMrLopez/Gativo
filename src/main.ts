import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as os from 'os';

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterfaces = interfaces[name];
    if (networkInterfaces) {
      for (const netInterface of networkInterfaces) {
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          return netInterface.address;
        }
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  const ip = getLocalIP();
  console.log(`🚀 Point your antenna to address: http://${ip}:${port}`);
  await app.listen(port);
}
bootstrap();
