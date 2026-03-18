import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { ShellyModule } from '../shelly/shelly.module';
import { DevicesModule } from '../devices/devices.module';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [ShellyModule, DevicesModule, MetadataModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
