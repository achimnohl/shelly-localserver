import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceLogDocument = DeviceLog & Document;

@Schema({ timestamps: false })
export class DeviceLog {
  @Prop({ type: Types.ObjectId, ref: 'Device', required: true })
  deviceId: Types.ObjectId;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ required: true })
  eventType: string; // 'state_change', 'power_reading', 'connection_lost', etc.

  @Prop({ type: Object })
  state: Record<string, any>;

  @Prop({
    type: {
      power: Number,
      voltage: Number,
      current: Number,
      energy: Number,
      temperature: Number,
    },
  })
  metrics?: {
    power?: number;
    voltage?: number;
    current?: number;
    energy?: number;
    temperature?: number;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const DeviceLogSchema = SchemaFactory.createForClass(DeviceLog);

// Create compound index for time-series queries
DeviceLogSchema.index({ deviceId: 1, timestamp: -1 });
DeviceLogSchema.index({ timestamp: 1 });
