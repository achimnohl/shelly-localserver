import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DeviceInfo, DeviceStatus, IShellyAdapter } from '../interfaces/shelly.interface';

@Injectable()
export class Gen2Adapter implements IShellyAdapter {
  private readonly logger = new Logger(Gen2Adapter.name);
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
        this.httpService.post(
          `http://${ip}/rpc/Shelly.GetStatus`,
          {},
          { timeout: this.timeout }
        )
      );

      return this.normalizeStatus(response.data);
    } catch (error) {
      this.logger.error(`Failed to get status from Gen2 device ${ip}: ${error.message}`);
      return { online: false };
    }
  }

  async setSwitch(ip: string, channel: number, state: boolean): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `http://${ip}/rpc/Switch.Set`,
          {
            id: channel,
            on: state,
          },
          { timeout: this.timeout }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to set switch on Gen2 device ${ip}: ${error.message}`);
      throw error;
    }
  }

  async toggle(ip: string, channel: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `http://${ip}/rpc/Switch.Toggle`,
          { id: channel },
          { timeout: this.timeout }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to toggle Gen2 device ${ip}: ${error.message}`);
      throw error;
    }
  }

  async getDeviceInfo(ip: string): Promise<DeviceInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `http://${ip}/rpc/Shelly.GetDeviceInfo`,
          {},
          { timeout: this.timeout }
        )
      );

      const data = response.data;
      return {
        model: data.model || 'Unknown',
        generation: data.gen === 3 ? 'gen3' : 'gen2',
        macAddress: data.mac || '',
        firmwareVersion: data.fw_id || '',
        hostname: data.id || '',
      };
    } catch (error) {
      this.logger.error(`Failed to get device info from Gen2 device ${ip}: ${error.message}`);
      throw error;
    }
  }

  private normalizeStatus(data: any): DeviceStatus {
    const status: DeviceStatus = {
      online: true,
      switch: [],
    };

    // Handle switches
    if (data && typeof data === 'object') {
      const switchKeys = Object.keys(data).filter((key) => key.startsWith('switch:'));
      
      switchKeys.forEach((key) => {
        const switchData = data[key];
        const channelMatch = key.match(/switch:(\d+)/);
        const channel = channelMatch ? parseInt(channelMatch[1], 10) : 0;

        status.switch?.push({
          output: switchData.output || false,
          channel,
        });

        // Add power metrics if available
        if (switchData.apower !== undefined) {
          status.power = (status.power || 0) + switchData.apower;
        }
        if (switchData.voltage !== undefined) {
          status.voltage = switchData.voltage;
        }
        if (switchData.current !== undefined) {
          status.current = (status.current || 0) + switchData.current;
        }
        if (switchData.aenergy) {
          status.energy = (status.energy || 0) + (switchData.aenergy.total || 0);
        }
      });

      // Handle temperature sensors
      const tempKeys = Object.keys(data).filter((key) => key.startsWith('temperature:'));
      if (tempKeys.length > 0) {
        const tempData = data[tempKeys[0]];
        if (tempData && tempData.tC !== undefined) {
          status.temperature = tempData.tC;
        }
      }

      // Handle smoke detectors
      if (data['smoke:0']) {
        status.smoke = {
          alarm: data['smoke:0'].alarm || false,
        };
      }
    }

    return status;
  }
}
