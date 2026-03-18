import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { ShellyService } from '../shelly/shelly.service';
import { CreateDeviceDto, UpdateDeviceDto, ControlDeviceDto } from './dto/device.dto';

@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(
    private readonly devicesService: DevicesService,
    private readonly shellyService: ShellyService,
  ) {}

  @Post()
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    this.logger.log(`Creating device: ${createDeviceDto.name}`);
    
    // Validate device is reachable
    const probe = await this.shellyService.probeDevice(createDeviceDto.ip);
    if (!probe.reachable) {
      throw new BadRequestException(`Device at ${createDeviceDto.ip} is not reachable`);
    }

    // If device info was retrieved, use it to populate fields
    if (probe.info) {
      createDeviceDto.model = createDeviceDto.model || probe.info.model;
      createDeviceDto.generation = probe.info.generation;
      createDeviceDto.macAddress = probe.info.macAddress;
      createDeviceDto.firmwareVersion = probe.info.firmwareVersion;
    }

    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  async findAll(@Query('includeMetadata') includeMetadata?: string) {
    this.logger.log('📋 GET /devices - Fetching all devices');
    
    // Default to including metadata for better frontend experience
    const shouldIncludeMetadata = includeMetadata !== 'false';
    
    if (shouldIncludeMetadata) {
      const devices = await this.devicesService.findAllWithMetadata();
      this.logger.log(`📋 Found ${devices.length} devices with metadata`);
      return devices;
    } else {
      const devices = await this.devicesService.findAll();
      this.logger.log(`📋 Found ${devices.length} devices`);
      return devices;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    this.logger.log(`Updating device: ${id}`);
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Put(':id/metadata')
  async updateMetadata(
    @Param('id') id: string,
    @Body() metadata: { name?: string; roomName?: string; category?: string; relayUsage?: string; applianceType?: number },
  ) {
    this.logger.log(`Updating metadata for device: ${id}`);
    return this.devicesService.updateMetadata(id, metadata);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting device: ${id}`);
    await this.devicesService.remove(id);
    return { message: 'Device deleted successfully' };
  }

  @Post(':id/control')
  async control(@Param('id') id: string, @Body() controlDto: ControlDeviceDto) {
    this.logger.log(`Controlling device ${id}: ${controlDto.action}`);
    
    const device = await this.devicesService.findOne(id);
    const channel = controlDto.channel || 0;

    try {
      switch (controlDto.action) {
        case 'on':
          await this.shellyService.setDeviceSwitch(device.ip, device.generation, channel, true);
          break;
        case 'off':
          await this.shellyService.setDeviceSwitch(device.ip, device.generation, channel, false);
          break;
        case 'toggle':
          await this.shellyService.toggleDevice(device.ip, device.generation, channel);
          break;
        default:
          throw new BadRequestException(`Unknown action: ${controlDto.action}`);
      }

      // Get updated status
      const status = await this.shellyService.getDeviceStatus(device.ip, device.generation);
      
      // Update device state in database
      await this.devicesService.updateState(id, status, status.online);

      // Log the state change
      await this.devicesService.logDeviceEvent(
        id,
        'state_change',
        status,
        status.power ? { power: status.power, voltage: status.voltage, current: status.current } : undefined
      );

      // Return device with metadata enrichment
      return this.devicesService.findOneWithMetadata(id);
    } catch (error) {
      this.logger.error(`Failed to control device ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to control device: ${error.message}`);
    }
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    this.logger.log(`Getting fresh status for device: ${id}`);
    
    const device = await this.devicesService.findOne(id);

    try {
      const status = await this.shellyService.getDeviceStatus(device.ip, device.generation);
      
      // Update device state in database
      await this.devicesService.updateState(id, status, status.online);

      return status;
    } catch (error) {
      this.logger.error(`Failed to get status for device ${id}: ${error.message}`);
      
      // Mark device as offline
      await this.devicesService.updateState(id, {}, false);
      
      throw new BadRequestException(`Failed to get device status: ${error.message}`);
    }
  }

  @Get(':id/history')
  async getHistory(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const maxLimit = limit ? parseInt(limit, 10) : 100;

    return this.devicesService.getDeviceHistory(id, start, end, maxLimit);
  }
}
