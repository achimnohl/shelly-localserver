import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Room extends Document {
  @Prop({ required: true, unique: true })
  cloudRoomId: string; // Room ID from Shelly Cloud

  @Prop({ required: true })
  name: string;

  @Prop()
  image?: string;

  @Prop()
  mainSensor?: string;

  @Prop()
  position?: number;

  @Prop({ type: Date })
  modified?: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
