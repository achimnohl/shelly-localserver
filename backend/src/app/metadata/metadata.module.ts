import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetadataController } from './metadata.controller';
import { DeviceMetadataService } from '../services/device-metadata.service';
import { RoomService } from '../services/room.service';
import { DeviceMetadata, DeviceMetadataSchema } from '../models/device-metadata.schema';
import { Room, RoomSchema } from '../models/room.schema';
import { Device, DeviceSchema } from '../devices/schemas/device.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceMetadata.name, schema: DeviceMetadataSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [MetadataController],
  providers: [DeviceMetadataService, RoomService],
  exports: [DeviceMetadataService, RoomService],
})
export class MetadataModule {}
