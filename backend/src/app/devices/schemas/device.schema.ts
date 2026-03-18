import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @Prop()
  name?: string; // Deprecated: Use metadata.name instead

  @Prop({ required: true, unique: true })
  ip: string;

  @Prop({ required: true })
  type: string; // 'plug', 'relay', 'dimmer', 'sensor', 'smoke_detector'

  @Prop()
  model: string;

  @Prop({ required: true })
  generation: string; // 'gen1', 'gen2', 'gen3', 'plus'

  @Prop({ unique: true, sparse: true })
  macAddress?: string;

  @Prop()
  firmwareVersion?: string;

  @Prop({ default: false })
  online: boolean;

  @Prop({ type: Object })
  state: Record<string, any>;

  @Prop({ type: [String], default: [] })
  capabilities: string[];

  @Prop({ default: Date.now })
  lastSeen: Date;

  // Power monitoring metrics
  @Prop()
  currentPower?: number; // Current power consumption in watts

  @Prop()
  voltage?: number; // Current voltage

  @Prop()
  current?: number; // Current in amps

  @Prop()
  totalEnergy?: number; // Total energy consumption in Wh

  @Prop()
  lastPowerUpdate?: Date; // When power metrics were last updated
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

// Create indexes
DeviceSchema.index({ ip: 1 });
DeviceSchema.index({ macAddress: 1 });
DeviceSchema.index({ online: 1, lastSeen: 1 });
