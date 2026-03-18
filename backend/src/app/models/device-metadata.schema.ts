import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class DeviceMetadata extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Device', required: true })
  deviceId: Types.ObjectId; // Reference to the main Device document

  @Prop({ required: true, unique: true })
  cloudId: string; // Device ID from Shelly Cloud (usually MAC address)

  @Prop()
  name?: string; // User-defined device name

  @Prop()
  roomId?: string; // Room ID from Shelly Cloud

  @Prop()
  roomName?: string; // Room name (denormalized for quick access)

  @Prop()
  category?: string; // relay, sensor, power_meter, gateway, etc.

  @Prop()
  applianceType?: number; // Appliance type code from Shelly Cloud

  @Prop()
  relayUsage?: string; // light, roller, entertainment, water_heater, etc.

  @Prop()
  position?: number; // Position in Shelly Cloud UI

  @Prop()
  image?: string; // Device image path from Shelly Cloud

  @Prop()
  channel?: number; // Channel number for multi-channel devices

  @Prop()
  channelsCount?: number; // Total channels for the device

  @Prop()
  mode?: string; // Device mode (relay, sensor, gateway, etc.)

  @Prop({ type: Date })
  cloudModified?: Date; // Last modified date from Shelly Cloud

  @Prop({ type: Object })
  cloudOptions?: Record<string, any>; // Additional cloud options

  @Prop({ type: Object })
  additionalData?: Record<string, any>; // Any other metadata from Shelly Cloud
}

export const DeviceMetadataSchema = SchemaFactory.createForClass(DeviceMetadata);

// Create index for faster lookups
DeviceMetadataSchema.index({ deviceId: 1 });
DeviceMetadataSchema.index({ cloudId: 1 });
