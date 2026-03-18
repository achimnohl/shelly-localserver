import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeviceMetadata } from '../models/device-metadata.schema';
import { Device, DeviceDocument } from '../devices/schemas/device.schema';
import { RoomService } from './room.service';

interface ShellyCloudDevice {
  id: string;
  type: string;
  category: string;
  position: number;
  gen: string | number;
  channel: number;
  channels_count: number;
  mode: string;
  name: string;
  room_id: number;
  image: string;
  cloud_online: boolean;
  modified: number;
  ip?: string;
  appliance_type?: number;
  relay_usage?: string;
  cloud_options?: Record<string, any>;
  [key: string]: any;
}

@Injectable()
export class DeviceMetadataService {
  private readonly logger = new Logger(DeviceMetadataService.name);

  constructor(
    @InjectModel(DeviceMetadata.name) private metadataModel: Model<DeviceMetadata>,
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    private roomService: RoomService,
  ) {}

  /**
   * Import device metadata from Shelly Cloud
   */
  async importFromShellyCloud(cloudData: {
    devices: Record<string, ShellyCloudDevice>;
    rooms: Record<string, any>;
  }): Promise<{ imported: number; updated: number; failed: number }> {
    this.logger.log('📥 Starting Shelly Cloud metadata import...');

    // First, import rooms
    await this.roomService.importRoomsFromCloud(cloudData.rooms);

    let imported = 0;
    let updated = 0;
    let failed = 0;

    // Then import device metadata
    for (const [cloudId, deviceInfo] of Object.entries(cloudData.devices)) {
      try {
        // Find matching device by MAC address or IP
        const device = await this.findDeviceByCloudId(cloudId, deviceInfo.ip);

        if (!device) {
          this.logger.warn(`  ⚠️ No matching device found for ${deviceInfo.name} (${cloudId})`);
          failed++;
          continue;
        }

        // Get room name if room_id exists
        let roomName: string | undefined;
        if (deviceInfo.room_id) {
          const room = await this.roomService.findByCloudId(deviceInfo.room_id.toString());
          roomName = room?.name;
        }

        // Prepare metadata
        const metadataData = {
          deviceId: device._id as Types.ObjectId,
          cloudId: cloudId,
          name: deviceInfo.name && deviceInfo.name.trim() ? deviceInfo.name : undefined,
          roomId: deviceInfo.room_id?.toString(),
          roomName: roomName,
          category: deviceInfo.category,
          applianceType: deviceInfo.appliance_type,
          relayUsage: deviceInfo.relay_usage,
          position: deviceInfo.position,
          image: deviceInfo.image,
          channel: deviceInfo.channel,
          channelsCount: deviceInfo.channels_count,
          mode: deviceInfo.mode,
          cloudModified: deviceInfo.modified ? new Date(deviceInfo.modified * 1000) : undefined,
          cloudOptions: deviceInfo.cloud_options,
          additionalData: {
            cloudOnline: deviceInfo.cloud_online,
            ssid: deviceInfo.ssid,
            gen: deviceInfo.gen,
          },
        };

        // Check if metadata already exists
        const existingMetadata = await this.metadataModel.findOne({ cloudId });

        if (existingMetadata) {
          await this.metadataModel.updateOne({ cloudId }, metadataData);
          updated++;
          this.logger.log(`  ✅ Updated metadata: ${deviceInfo.name} → ${roomName || 'No room'}`);
        } else {
          await this.metadataModel.create(metadataData);
          imported++;
          this.logger.log(`  ✨ Imported metadata: ${deviceInfo.name} → ${roomName || 'No room'}`);
        }
      } catch (error) {
        this.logger.error(`  ❌ Failed to import metadata for ${cloudId}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`📥 Metadata import complete: ${imported} new, ${updated} updated, ${failed} failed`);
    return { imported, updated, failed };
  }

  /**
   * Find device by Shelly Cloud ID (MAC address) or IP
   */
  private async findDeviceByCloudId(cloudId: string, ip?: string): Promise<DeviceDocument | null> {
    // Try to match by MAC address (remove colons and make lowercase)
    const cleanCloudId = cloudId.replace(/[:\-]/g, '').toLowerCase();
    
    // First try exact MAC match
    let device = await this.deviceModel.findOne({
      macAddress: new RegExp(cleanCloudId, 'i'),
    }).exec();

    if (device) {
      return device;
    }

    // Try partial MAC match (last 6 characters of cloud ID might match last part of MAC)
    if (cleanCloudId.length >= 12) {
      const lastSixChars = cleanCloudId.slice(-12);
      device = await this.deviceModel.findOne({
        macAddress: { $regex: lastSixChars, $options: 'i' },
      }).exec();

      if (device) {
        return device;
      }
    }

    // If we have an IP, try IP match
    if (ip) {
      device = await this.deviceModel.findOne({ ip }).exec();
      if (device) {
        return device;
      }
    }

    return null;
  }

  /**
   * Get metadata for a device
   */
  async getByDeviceId(deviceId: string | Types.ObjectId): Promise<DeviceMetadata | null> {
    return this.metadataModel.findOne({ deviceId }).exec();
  }

  /**
   * Update metadata for a device
   */
  async updateMetadata(deviceId: string | Types.ObjectId, updateData: Partial<{
    name: string;
    roomName: string;
    category: string;
    relayUsage: string;
    applianceType: number;
  }>): Promise<DeviceMetadata | null> {
    this.logger.log(`📝 Updating metadata for device ${deviceId}`);
    
    // Check if metadata exists
    let metadata = await this.metadataModel.findOne({ deviceId }).exec();
    
    if (metadata) {
      // Update existing metadata
      Object.assign(metadata, updateData);
      await metadata.save();
      this.logger.log(`✅ Metadata updated for device ${deviceId}`);
    } else {
      // Create new metadata if it doesn't exist
      metadata = await this.metadataModel.create({
        deviceId,
        cloudId: `manual-${deviceId}`,
        ...updateData,
      });
      this.logger.log(`✨ Metadata created for device ${deviceId}`);
    }
    
    return metadata;
  }

  /**
   * Get all metadata with room information
   */
  async findAll(): Promise<DeviceMetadata[]> {
    return this.metadataModel.find().exec();
  }

  /**
   * Delete metadata for a device
   */
  async deleteByDeviceId(deviceId: string | Types.ObjectId): Promise<void> {
    await this.metadataModel.deleteOne({ deviceId }).exec();
  }

  /**
   * Migrate device names from Device collection to DeviceMetadata
   * This is a one-time migration method
   */
  async migrateDeviceNames(): Promise<{
    totalDevices: number;
    migrated: number;
    skipped: number;
    errors: number;
    errorDetails: Array<{ deviceId: string; error: string }>;
  }> {
    this.logger.log('🔄 Starting device name migration...');

    const devices = await this.deviceModel.find().exec();
    this.logger.log(`📋 Found ${devices.length} devices to process`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: Array<{ deviceId: string; error: string }> = [];

    for (const device of devices) {
      try {
        // Skip if device has no name
        if (!device.name || !device.name.trim()) {
          this.logger.log(`  ⏭️  Device ${device.ip} has no name, skipping`);
          skipped++;
          continue;
        }

        // Check if metadata already exists
        let metadata = await this.metadataModel.findOne({ deviceId: device._id }).exec();

        if (metadata) {
          // Metadata exists
          if (metadata.name && metadata.name.trim()) {
            // Metadata already has a name, skip
            this.logger.log(`  ⏭️  Device ${device.name} (${device.ip}) already has name in metadata`);
            skipped++;
          } else {
            // Metadata exists but no name, update it
            metadata.name = device.name;
            await metadata.save();
            this.logger.log(`  ✅ Migrated name for ${device.name} (${device.ip})`);
            migrated++;
          }
        } else {
          // No metadata exists, create it
          await this.metadataModel.create({
            deviceId: device._id,
            cloudId: `migrated-${device.macAddress || device.ip}`,
            name: device.name,
          });
          this.logger.log(`  ✨ Created metadata with name for ${device.name} (${device.ip})`);
          migrated++;
        }
      } catch (error) {
        this.logger.error(`  ❌ Failed to migrate device ${device._id}: ${error.message}`);
        errors++;
        errorDetails.push({
          deviceId: device._id.toString(),
          error: error.message,
        });
      }
    }

    this.logger.log('✅ Migration complete');
    this.logger.log(`  Total: ${devices.length} devices`);
    this.logger.log(`  Migrated: ${migrated}`);
    this.logger.log(`  Skipped: ${skipped}`);
    this.logger.log(`  Errors: ${errors}`);

    return {
      totalDevices: devices.length,
      migrated,
      skipped,
      errors,
      errorDetails,
    };
  }
}
