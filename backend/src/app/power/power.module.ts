import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PowerController } from './power.controller';
import { PowerMonitoringService } from '../services/power-monitoring.service';
import { Device, DeviceSchema } from '../devices/schemas/device.schema';
import { PowerMeasurement, PowerMeasurementSchema } from '../models/power-measurement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: PowerMeasurement.name, schema: PowerMeasurementSchema },
    ]),
  ],
  controllers: [PowerController],
  providers: [PowerMonitoringService],
  exports: [PowerMonitoringService],
})
export class PowerModule {}
