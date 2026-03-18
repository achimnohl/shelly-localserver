/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  Logger.log('🔧 Bootstrapping Shelly HomeServer...');
  const app = await NestFactory.create(AppModule);
  Logger.log('✅ NestJS application created');
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.log(`🔌 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/shellydb'}`);
  Logger.log(`⏱️  Polling Interval: ${process.env.POLLING_INTERVAL_SECONDS || 60}s`);
  Logger.log(`🔍 mDNS Discovery: ${process.env.MDNS_ENABLED !== 'false' ? 'enabled' : 'disabled'}`);
  Logger.log('');
  Logger.log('📝 DATABASE IS EMPTY - Getting Started:');
  Logger.log('   1. Discover devices automatically:');
  Logger.log(`      curl -X POST http://localhost:${port}/${globalPrefix}/discovery/scan`);
  Logger.log('   2. Or scan subnet (more reliable):');
  Logger.log(`      curl -X POST http://localhost:${port}/${globalPrefix}/discovery/scan-subnet`);
  Logger.log('   3. Or add device manually:');
  Logger.log(`      curl -X POST http://localhost:${port}/${globalPrefix}/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.185","name":"My Device"}'`);
  Logger.log('');
  Logger.log('📖 See GETTING_STARTED.md for more details');
  Logger.log('');
}

bootstrap();
