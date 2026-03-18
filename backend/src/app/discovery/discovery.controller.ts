import { Controller, Get, Post, Logger } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceMetadataService } from '../services/device-metadata.service';

@Controller('discovery')
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly devicesService: DevicesService,
    private readonly metadataService: DeviceMetadataService,
  ) {}

  @Post('scan')
  async scanNetwork() {
    this.logger.log('🔍 POST /discovery/scan - Network scan requested (mDNS)');
    const devices = await this.discoveryService.scanNetwork();
    this.logger.log(`✅ Network scan complete: ${devices.length} devices found`);
    return {
      found: devices.length,
      devices,
    };
  }

  @Post('scan-subnet')
  async scanSubnet() {
    this.logger.log('🔍 POST /discovery/scan-subnet - Subnet scan requested');
    const devices = await this.discoveryService.scanSubnet();
    this.logger.log(`✅ Subnet scan complete: ${devices.length} devices found`);
    return {
      found: devices.length,
      devices,
    };
  }

  @Post('scan-and-save')
  async scanAndSave() {
    this.logger.log('🔍 POST /discovery/scan-and-save - Scanning and saving devices (mDNS)');
    const devices = await this.discoveryService.scanNetwork();
    this.logger.log(`✅ Found ${devices.length} devices via mDNS`);
    
    const savedDevices = [];
    const errors = [];
    
    for (const device of devices) {
      try {
        // Check if device already exists by IP
        const existing = await this.devicesService.findByIp(device.ip);
        
        if (existing) {
          this.logger.log(`  ⏭️  Device at ${device.ip} already exists, skipping`);
          continue;
        }
        
        // Create device
        const saved = await this.devicesService.create({
          ip: device.ip,
          name: device.hostname || device.model || `Device-${device.ip}`,
          type: this.getDeviceType(device.model),
          model: device.model,
          generation: device.generation,
          macAddress: device.macAddress,
          firmwareVersion: device.firmwareVersion,
        });
        
        // Create metadata with the device name
        const deviceName = device.hostname || device.model || `Device-${device.ip}`;
        if ((saved as any)._id) {
          await this.metadataService.updateMetadata((saved as any)._id, {
            name: deviceName,
          });
        }
        
        savedDevices.push(saved);
        this.logger.log(`  ✅ Saved ${saved.name} (${saved.ip})`);
      } catch (error) {
        this.logger.error(`  ❌ Failed to save device ${device.ip}: ${error.message}`);
        errors.push({ ip: device.ip, error: error.message });
      }
    }
    
    this.logger.log(`✅ Scan and save complete: ${savedDevices.length} devices saved, ${errors.length} errors`);
    
    return {
      discovered: devices.length,
      saved: savedDevices.length,
      skipped: devices.length - savedDevices.length - errors.length,
      errors: errors.length,
      devices: savedDevices,
    };
  }

  @Post('scan-subnet-and-save')
  async scanSubnetAndSave() {
    this.logger.log('🔍 POST /discovery/scan-subnet-and-save - Scanning and saving devices (subnet)');
    const devices = await this.discoveryService.scanSubnet();
    this.logger.log(`✅ Found ${devices.length} devices via subnet scan`);
    
    const savedDevices = [];
    const errors = [];
    
    for (const device of devices) {
      try {
        // Check if device already exists by IP
        const existing = await this.devicesService.findByIp(device.ip);
        
        if (existing) {
          this.logger.log(`  ⏭️  Device at ${device.ip} already exists, skipping`);
          continue;
        }
        
        // Create device
        const saved = await this.devicesService.create({
          ip: device.ip,
          name: device.hostname || device.model || `Device-${device.ip}`,
          type: this.getDeviceType(device.model),
          model: device.model,
          generation: device.generation,
          macAddress: device.macAddress,
          firmwareVersion: device.firmwareVersion,
        });
        
        // Create metadata with the device name
        const deviceName = device.hostname || device.model || `Device-${device.ip}`;
        if ((saved as any)._id) {
          await this.metadataService.updateMetadata((saved as any)._id, {
            name: deviceName,
          });
        }
        
        savedDevices.push(saved);
        this.logger.log(`  ✅ Saved ${saved.name} (${saved.ip})`);
      } catch (error) {
        this.logger.error(`  ❌ Failed to save device ${device.ip}: ${error.message}`);
        errors.push({ ip: device.ip, error: error.message });
      }
    }
    
    this.logger.log(`✅ Scan and save complete: ${savedDevices.length} devices saved, ${errors.length} errors`);
    
    return {
      discovered: devices.length,
      saved: savedDevices.length,
      skipped: devices.length - savedDevices.length - errors.length,
      errors: errors.length,
      devices: savedDevices,
    };
  }

  private getDeviceType(model: string | undefined): string {
    if (!model) return 'unknown';
    
    const modelLower = model.toLowerCase();
    
    if (modelLower.includes('plug')) return 'plug';
    if (modelLower.includes('switch') || modelLower.includes('sw')) return 'switch';
    if (modelLower.includes('pm')) return 'power_meter';
    if (modelLower.includes('dimmer')) return 'dimmer';
    if (modelLower.includes('rgbw')) return 'light';
    if (modelLower.includes('bulb')) return 'bulb';
    if (modelLower.includes('sensor') || modelLower.includes('h&t')) return 'sensor';
    if (modelLower.includes('smoke')) return 'smoke_detector';
    if (modelLower.includes('door') || modelLower.includes('window')) return 'door_window';
    if (modelLower.includes('button')) return 'button';
    if (modelLower.includes('relay')) return 'relay';
    
    return 'switch'; // default to switch for most devices
  }
}
