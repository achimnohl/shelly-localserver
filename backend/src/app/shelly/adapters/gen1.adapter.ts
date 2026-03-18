import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DeviceInfo, DeviceStatus, IShellyAdapter } from '../interfaces/shelly.interface';

@Injectable()
export class Gen1Adapter implements IShellyAdapter {
  private readonly logger = new Logger(Gen1Adapter.name);
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.timeout = this.configService.get<number>('DEVICE_TIMEOUT_SECONDS', 5) * 1000;
  }

  async getStatus(ip: string): Promise<DeviceStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://${ip}/status`, {
          timeout: this.timeout,
        })
      );

      return this.normalizeStatus(response.data);
    } catch (error) {
      this.logger.error(`Failed to get status from Gen1 device ${ip}: ${error.message}`);
      return { online: false };
    }
  }

  async setSwitch(ip: string, channel: number, state: boolean): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get(`http://${ip}/relay/${channel}?turn=${state ? 'on' : 'off'}`, {
          timeout: this.timeout,
        })
      );
    } catch (error) {
      this.logger.error(`Failed to set switch on Gen1 device ${ip}: ${error.message}`);
      throw error;
    }
  }

  async toggle(ip: string, channel: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get(`http://${ip}/relay/${channel}?turn=toggle`, {
          timeout: this.timeout,
        })
      );
    } catch (error) {
      this.logger.error(`Failed to toggle Gen1 device ${ip}: ${error.message}`);
      throw error;
    }
  }

  async getDeviceInfo(ip: string): Promise<DeviceInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://${ip}/shelly`, {
          timeout: this.timeout,
        })
      );

      const data = response.data;
      return {
        model: data.type || 'Unknown',
        generation: 'gen1',
        macAddress: data.mac || '',
        firmwareVersion: data.fw || '',
        hostname: data.hostname || '',
      };
    } catch (error) {
      this.logger.error(`Failed to get device info from Gen1 device ${ip}: ${error.message}`);
      throw error;
    }
  }

  private normalizeStatus(data: any): DeviceStatus {
    const status: DeviceStatus = {
      online: true,
      switch: [],
    };

    // Handle relays
    if (data.relays && Array.isArray(data.relays)) {
      status.switch = data.relays.map((relay: any, index: number) => ({
        output: relay.ison || false,
        channel: index,
      }));
    }

    // Handle power meters
    if (data.meters && Array.isArray(data.meters)) {
      const meter = data.meters[0];
      if (meter) {
        status.power = meter.power;
        status.voltage = meter.voltage;
        status.current = meter.current;
      }
    }

    // Handle temperature
    if (data.temperature !== undefined) {
      status.temperature = data.temperature;
    }

    return status;
  }
}
