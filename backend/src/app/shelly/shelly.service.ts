import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gen1Adapter } from './adapters/gen1.adapter';
import { Gen2Adapter } from './adapters/gen2.adapter';
import { DeviceInfo, DeviceStatus, IShellyAdapter } from './interfaces/shelly.interface';

@Injectable()
export class ShellyService {
  private readonly logger = new Logger(ShellyService.name);
  private readonly adapters: Map<string, IShellyAdapter> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Initialize adapters
    this.adapters.set('gen1', new Gen1Adapter(httpService, configService));
    this.adapters.set('gen2', new Gen2Adapter(httpService, configService));
    this.adapters.set('gen3', new Gen2Adapter(httpService, configService)); // Gen3 uses same API as Gen2
    this.adapters.set('plus', new Gen2Adapter(httpService, configService)); // Plus series uses Gen2 API
  }

  private getAdapter(generation: string): IShellyAdapter {
    const adapter = this.adapters.get(generation.toLowerCase());
    if (!adapter) {
      this.logger.warn(`No adapter found for generation ${generation}, using Gen2 as default`);
      return this.adapters.get('gen2')!;
    }
    return adapter;
  }

  async getDeviceStatus(ip: string, generation: string): Promise<DeviceStatus> {
    const adapter = this.getAdapter(generation);
    return adapter.getStatus(ip);
  }

  async setDeviceSwitch(
    ip: string,
    generation: string,
    channel: number,
    state: boolean
  ): Promise<void> {
    const adapter = this.getAdapter(generation);
    return adapter.setSwitch(ip, channel, state);
  }

  async toggleDevice(ip: string, generation: string, channel: number): Promise<void> {
    const adapter = this.getAdapter(generation);
    return adapter.toggle(ip, channel);
  }

  async getDeviceInfo(ip: string, generation?: string): Promise<DeviceInfo> {
    this.logger.log(`🔍 ShellyService.getDeviceInfo() - Getting info for ${ip}`);
    // Try to detect generation if not provided
    if (!generation) {
      this.logger.log(`🔍 Generation not specified, trying Gen2 first...`);
      // Try Gen2 first (most modern)
      try {
        const gen2Adapter = this.adapters.get('gen2')!;
        const info = await gen2Adapter.getDeviceInfo(ip);
        this.logger.log(`✅ Device at ${ip} is Gen2/Gen3/Plus: ${info.model}`);
        return info;
      } catch (error) {
        this.logger.log(`⚠️ Gen2 detection failed for ${ip}, trying Gen1...`);
        // Fall back to Gen1
        try {
          const gen1Adapter = this.adapters.get('gen1')!;
          const info = await gen1Adapter.getDeviceInfo(ip);
          this.logger.log(`✅ Device at ${ip} is Gen1: ${info.model}`);
          return info;
        } catch (gen1Error) {
          this.logger.error(`❌ Failed to detect device generation for ${ip}: ${gen1Error.message}`);
          throw gen1Error;
        }
      }
    }

    const adapter = this.getAdapter(generation);
    return adapter.getDeviceInfo(ip);
  }

  async probeDevice(ip: string): Promise<{ reachable: boolean; info?: DeviceInfo }> {
    this.logger.log(`🔍 ShellyService.probeDevice() - Probing device at ${ip}`);
    try {
      const info = await this.getDeviceInfo(ip);
      this.logger.log(`✅ Device at ${ip} is reachable: ${info.model} (${info.generation})`);
      this.logger.debug(`📊 Device info: ${JSON.stringify(info)}`);
      return { reachable: true, info };
    } catch (error) {
      this.logger.debug(`❌ Device at ${ip} is not reachable: ${error.message}`);
      return { reachable: false };
    }
  }
}
