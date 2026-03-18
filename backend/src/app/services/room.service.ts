import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room } from '../models/room.schema';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) {}

  /**
   * Import rooms from Shelly Cloud data
   */
  async importRoomsFromCloud(roomsData: Record<string, any>): Promise<void> {
    this.logger.log('🏠 Importing rooms from Shelly Cloud...');

    let imported = 0;
    let updated = 0;

    for (const [roomId, roomInfo] of Object.entries(roomsData)) {
      try {
        const existingRoom = await this.roomModel.findOne({ cloudRoomId: roomId });

        const roomData = {
          cloudRoomId: roomId,
          name: roomInfo.name,
          image: roomInfo.image,
          mainSensor: roomInfo.main_sensor || undefined,
          position: roomInfo.position,
          modified: roomInfo.modified ? new Date(roomInfo.modified * 1000) : undefined,
        };

        if (existingRoom) {
          await this.roomModel.updateOne({ cloudRoomId: roomId }, roomData);
          updated++;
          this.logger.log(`  ✅ Updated room: ${roomInfo.name} (ID: ${roomId})`);
        } else {
          await this.roomModel.create(roomData);
          imported++;
          this.logger.log(`  ✨ Imported room: ${roomInfo.name} (ID: ${roomId})`);
        }
      } catch (error) {
        this.logger.error(`  ❌ Failed to import room ${roomId}: ${error.message}`);
      }
    }

    this.logger.log(`🏠 Room import complete: ${imported} new, ${updated} updated`);
  }

  /**
   * Get all rooms
   */
  async findAll(): Promise<Room[]> {
    return this.roomModel.find().sort({ position: 1 }).exec();
  }

  /**
   * Get room by Cloud ID
   */
  async findByCloudId(cloudRoomId: string): Promise<Room | null> {
    return this.roomModel.findOne({ cloudRoomId }).exec();
  }

  /**
   * Get room by internal ID
   */
  async findById(id: string): Promise<Room | null> {
    return this.roomModel.findById(id).exec();
  }
}
