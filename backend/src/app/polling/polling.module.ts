import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PollingService } from './polling.service';
import { PowerPollingService } from './power-polling.service';
import { DevicesModule } from '../devices/devices.module';
import { ShellyModule } from '../shelly/shelly.module';
import { EventsModule } from '../events/events.module';
import { PowerModule } from '../power/power.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DevicesModule,
    ShellyModule,
    EventsModule,
    PowerModule,
  ],
  providers: [PollingService, PowerPollingService],
  exports: [PollingService, PowerPollingService],
})
export class PollingModule {}
