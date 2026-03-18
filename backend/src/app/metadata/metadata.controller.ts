import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { DeviceMetadataService } from '../services/device-metadata.service';
import { RoomService } from '../services/room.service';

@Controller('metadata')
export class MetadataController {
  private readonly logger = new Logger(MetadataController.name);

  constructor(
    private readonly metadataService: DeviceMetadataService,
    private readonly roomService: RoomService,
  ) {}

  /**
   * Import Shelly Cloud data
   * POST /api/metadata/import-cloud
   * 
   * Body: The entire Shelly Cloud JSON response with devices and rooms
   */
  @Post('import-cloud')
  async importCloudData(@Body() cloudData: any) {
    this.logger.log('🔍 Received Shelly Cloud data import request');

    if (!cloudData.data || !cloudData.data.devices || !cloudData.data.rooms) {
      return {
        success: false,
        error: 'Invalid Shelly Cloud data format. Expected: { data: { devices: {}, rooms: {} } }',
      };
    }

    try {
      const result = await this.metadataService.importFromShellyCloud({
        devices: cloudData.data.devices,
        rooms: cloudData.data.rooms,
      });

      return {
        success: true,
        message: 'Shelly Cloud metadata imported successfully',
        stats: result,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to import Shelly Cloud data: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all rooms
   * GET /api/metadata/rooms
   */
  @Get('rooms')
  async getRooms() {
    const rooms = await this.roomService.findAll();
    return {
      success: true,
      count: rooms.length,
      rooms,
    };
  }

  /**
   * Get all device metadata
   * GET /api/metadata/devices
   */
  @Get('devices')
  async getDeviceMetadata() {
    const metadata = await this.metadataService.findAll();
    return {
      success: true,
      count: metadata.length,
      metadata,
    };
  }

  /**
   * Migrate device names from Device collection to DeviceMetadata
   * POST /api/metadata/migrate-device-names
   * 
   * This is a one-time migration to move device names from the Device schema
   * to DeviceMetadata where they belong as user-defined metadata.
   */
  @Post('migrate-device-names')
  async migrateDeviceNames() {
    this.logger.log('🔄 Starting device name migration...');

    try {
      const result = await this.metadataService.migrateDeviceNames();

      this.logger.log(
        `✅ Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`
      );

      return {
        success: true,
        message: 'Device names migration completed',
        ...result,
      };
    } catch (error) {
      this.logger.error(`❌ Migration failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
