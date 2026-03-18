import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShellyService } from './shelly.service';

@Module({
  imports: [HttpModule],
  providers: [ShellyService],
  exports: [ShellyService],
})
export class ShellyModule {}
