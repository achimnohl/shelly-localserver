import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PowerMeasurementDocument = PowerMeasurement & Document;

@Schema({ timestamps: true })
export class PowerMeasurement {
  @Prop({ type: Types.ObjectId, ref: 'Device', required: true, index: true })
  deviceId: Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;

  // Current power consumption in watts
  @Prop({ type: Number })
  power?: number;

  // Voltage in volts
  @Prop({ type: Number })
  voltage?: number;

  // Current in amperes
  @Prop({ type: Number })
  current?: number;

  // Power factor
  @Prop({ type: Number })
  powerFactor?: number;

  // Energy counter in watt-hours
  @Prop({ type: Number })
  energyTotal?: number;

  // Channel/relay number (for multi-channel devices)
  @Prop({ type: Number, default: 0 })
  channel: number;

  // Device state at time of measurement
  @Prop({ type: Boolean })
  isOn?: boolean;
}

export const PowerMeasurementSchema = SchemaFactory.createForClass(PowerMeasurement);

// Indexes for efficient queries
PowerMeasurementSchema.index({ deviceId: 1, timestamp: -1 });
PowerMeasurementSchema.index({ timestamp: -1 });
