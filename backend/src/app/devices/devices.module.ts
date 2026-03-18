import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device, DeviceSchema } from './schemas/device.schema';
import { DeviceLog, DeviceLogSchema } from './schemas/device-log.schema';
import { ShellyModule } from '../shelly/shelly.module';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: DeviceLog.name, schema: DeviceLogSchema },
    ]),
    ShellyModule,
    MetadataModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
