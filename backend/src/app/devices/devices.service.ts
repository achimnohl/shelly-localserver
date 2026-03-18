import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from './schemas/device.schema';
import { DeviceLog, DeviceLogDocument } from './schemas/device-log.schema';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';
import { DeviceMetadataService } from '../services/device-metadata.service';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(DeviceLog.name) private deviceLogModel: Model<DeviceLogDocument>,
    private metadataService: DeviceMetadataService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    this.logger.log(`📝 DevicesService.create() - Creating device at ${createDeviceDto.ip}`);
    const createdDevice = new this.deviceModel({
      ...createDeviceDto,
      online: false,
      state: {},
      lastSeen: new Date(),
    });
    const saved = await createdDevice.save();
    this.logger.log(`✅ Device created: ${saved.name} (${saved._id})`);
    return saved;
  }

  async findAll(): Promise<Device[]> {
    this.logger.log('🔍 DevicesService.findAll() - Querying database');
    const devices = await this.deviceModel.find().exec();
    this.logger.log(`🔍 DevicesService.findAll() - Found ${devices.length} devices`);
    return devices;
  }

  /**
   * Get all devices with metadata enrichment
   */
  async findAllWithMetadata(): Promise<any[]> {
    this.logger.log('🔍 DevicesService.findAllWithMetadata() - Querying database');
    const devices = await this.deviceModel.find().exec();
    
    // Enrich each device with metadata
    const enriched = await Promise.all(
      devices.map(async (device) => {
        const metadata = await this.metadataService.getByDeviceId(device._id);
        const enrichedDevice = {
          ...device.toObject(),
          metadata: metadata ? {
            name: metadata.name,
            roomId: metadata.roomId,
            roomName: metadata.roomName,
            category: metadata.category,
            applianceType: metadata.applianceType,
            relayUsage: metadata.relayUsage,
            position: metadata.position,
          } : null,
        };
        // Use metadata name if available, fallback to device name
        if (metadata?.name) {
          enrichedDevice.name = metadata.name;
        } else if (!enrichedDevice.name) {
          // Generate default name from IP if no name exists
          enrichedDevice.name = `Device ${device.ip}`;
        }
        return enrichedDevice;
      })
    );

    this.logger.log(`🔍 DevicesService.findAllWithMetadata() - Enriched ${enriched.length} devices`);
    return enriched;
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceModel.findById(id).exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async findOneWithMetadata(id: string): Promise<any> {
    const device = await this.deviceModel.findById(id).exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    // Enrich with metadata
    const metadata = await this.metadataService.getByDeviceId(device._id);
    const enrichedDevice = {
      ...device.toObject(),
      metadata: metadata ? {
        name: metadata.name,
        roomId: metadata.roomId,
        roomName: metadata.roomName,
        category: metadata.category,
        applianceType: metadata.applianceType,
        relayUsage: metadata.relayUsage,
        position: metadata.position,
      } : null,
    };

    // Use metadata name if available, fallback to device name
    if (metadata?.name) {
      enrichedDevice.name = metadata.name;
    } else if (!enrichedDevice.name) {
      // Generate default name from IP if no name exists
      enrichedDevice.name = `Device ${device.ip}`;
    }

    return enrichedDevice;
  }

  async findByIp(ip: string): Promise<Device | null> {
    return this.deviceModel.findOne({ ip }).exec();
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.deviceModel
      .findByIdAndUpdate(id, updateDeviceDto, { new: true })
      .exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async updateMetadata(id: string, metadata: Partial<{
    name: string;
    roomName: string;
    category: string;
    relayUsage: string;
    applianceType: number;
  }>): Promise<any> {
    // First verify the device exists
    const device = await this.deviceModel.findById(id).exec() as DeviceDocument;
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    
    // Update the metadata
    await this.metadataService.updateMetadata(device._id, metadata);
    
    // Return the device with updated metadata
    const updatedMetadata = await this.metadataService.getByDeviceId(device._id);
    const result = {
      ...device.toObject(),
      metadata: updatedMetadata ? {
        name: updatedMetadata.name,
        roomId: updatedMetadata.roomId,
        roomName: updatedMetadata.roomName,
        category: updatedMetadata.category,
        applianceType: updatedMetadata.applianceType,
        relayUsage: updatedMetadata.relayUsage,
        position: updatedMetadata.position,
      } : null,
    };
    // Use metadata name if available
    if (updatedMetadata?.name) {
      result.name = updatedMetadata.name;
    }
    return result;
  }

  async updateState(id: string, state: any, online: boolean = true): Promise<Device> {
    const updateData: any = {
      state,
      online,
      lastSeen: new Date(),
    };

    // Extract and store power metrics if available
    if (state.power !== undefined) {
      updateData.currentPower = state.power;
      updateData.lastPowerUpdate = new Date();
    }
    if (state.voltage !== undefined) {
      updateData.voltage = state.voltage;
    }
    if (state.current !== undefined) {
      updateData.current = state.current;
    }
    if (state.energy !== undefined) {
      updateData.totalEnergy = state.energy;
    }

    const device = await this.deviceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async remove(id: string): Promise<void> {
    const result = await this.deviceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
  }

  async logDeviceEvent(
    deviceId: string,
    eventType: string,
    state: any,
    metrics?: any
  ): Promise<void> {
    const log = new this.deviceLogModel({
      deviceId,
      timestamp: new Date(),
      eventType,
      state,
      metrics,
    });
    await log.save();
  }

  async getDeviceHistory(
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<DeviceLog[]> {
    const query: any = { deviceId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    return this.deviceLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
