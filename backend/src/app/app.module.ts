import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevicesModule } from './devices/devices.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { PollingModule } from './polling/polling.module';
import { EventsModule } from './events/events.module';
import { MetadataModule } from './metadata/metadata.module';
import { PowerModule } from './power/power.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/shellydb', {
      serverSelectionTimeoutMS: 5000,
      connectionFactory: (connection) => {
        connection.on('connected', () => {
          Logger.log('✅ MongoDB connected successfully', 'MongooseModule');
        });
        connection.on('error', (error) => {
          Logger.error(`❌ MongoDB connection error: ${error.message}`, error.stack, 'MongooseModule');
        });
        connection.on('disconnected', () => {
          Logger.warn('⚠️  MongoDB disconnected', 'MongooseModule');
        });
        return connection;
      },
    }),
    DevicesModule,
    DiscoveryModule,
    PollingModule,
    EventsModule,
    MetadataModule,
    PowerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
