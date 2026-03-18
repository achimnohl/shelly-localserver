import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DevicesService } from '../devices/devices.service';
import { ShellyService } from '../shelly/shelly.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class PollingService implements OnModuleInit {
  private readonly logger = new Logger(PollingService.name);
  private pollingInterval: number;
  private isPolling = false;
  private failedAttempts: Map<string, number> = new Map();
  private readonly maxFailedAttempts = 3;
  private readonly retryDelayMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly devicesService: DevicesService,
    private readonly shellyService: ShellyService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.pollingInterval = this.configService.get<number>('POLLING_INTERVAL_SECONDS', 60);
    this.retryDelayMinutes = this.configService.get<number>('RETRY_FAILED_DEVICES_MINUTES', 15);
  }

  onModuleInit() {
    this.logger.log(`Polling service initialized with interval: ${this.pollingInterval}s`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePolling() {
    // Check if it's time to poll based on configured interval
    const currentMinute = new Date().getMinutes();
    if (currentMinute % Math.ceil(this.pollingInterval / 60) !== 0) {
      return;
    }

    if (this.isPolling) {
      this.logger.warn('Previous polling cycle not complete, skipping...');
      return;
    }

    await this.pollAllDevices();
  }

  async pollAllDevices(): Promise<void> {
    this.isPolling = true;
    this.logger.log('⏱️ PollingService.pollAllDevices() - Starting device polling cycle...');

    try {
      const devices = await this.devicesService.findAll();
      const onlineCount = devices.filter(d => d.online).length;
      
      this.logger.log(`⏱️ Polling ${devices.length} devices (${onlineCount} currently online)...`);
      
      if (devices.length === 0) {
        this.logger.warn('⚠️ No devices to poll. Add devices manually via POST /devices or run discovery via POST /discovery/scan');
        return;
      }

      const promises = devices.map(device => this.pollDevice((device as any)._id?.toString() || '', device));
      await Promise.all(promises);

      // Broadcast system stats
      const updatedDevices = await this.devicesService.findAll();
      const updatedOnlineCount = updatedDevices.filter(d => d.online).length;
      
      this.eventsGateway.broadcastSystemStats({
        totalDevices: updatedDevices.length,
        onlineDevices: updatedOnlineCount,
        offlineDevices: updatedDevices.length - updatedOnlineCount,
      });

      this.logger.log(`Polling cycle complete. ${updatedOnlineCount}/${updatedDevices.length} devices online`);
    } catch (error) {
      this.logger.error(`Error during polling cycle: ${error.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  private async pollDevice(deviceId: string, device: any): Promise<void> {
    const deviceKey = deviceId;

    // Check if device should be skipped due to repeated failures
    const failedCount = this.failedAttempts.get(deviceKey) || 0;
    if (failedCount >= this.maxFailedAttempts) {
      this.logger.debug(`⏭️ Skipping ${device.name} (${device.ip}) - max failures reached`);
      // Skip polling for devices that have failed multiple times
      // They will be retried after the configured delay
      return;
    }

    this.logger.log(`  🔍 Polling ${device.name} (${device.ip})...`);
    try {
      const status = await this.shellyService.getDeviceStatus(device.ip, device.generation);
      this.logger.debug(`  📊 Status received: ${JSON.stringify(status)}`);

      if (!status.online) {
        throw new Error('Device reported as offline');
      }

      // Check if state has changed
      const stateChanged = JSON.stringify(device.state) !== JSON.stringify(status);

      // Update device in database
      const updatedDevice = await this.devicesService.updateState(deviceId, status, true);

      // Reset failed attempts counter
      this.failedAttempts.delete(deviceKey);

      // Log state change if enabled
      if (stateChanged && this.configService.get<boolean>('LOG_STATE_CHANGES', true)) {
        await this.devicesService.logDeviceEvent(
          deviceId,
          'state_change',
          status,
          status.power ? { power: status.power, voltage: status.voltage, current: status.current } : undefined
        );
      }

      // Log power readings at configured interval
      const logPowerInterval = this.configService.get<number>('LOG_POWER_READINGS_INTERVAL_SECONDS', 300);
      if (status.power !== undefined && logPowerInterval > 0) {
        // Check if we should log power reading
        const lastLog = await this.devicesService.getDeviceHistory(deviceId, undefined, undefined, 1);
        const shouldLog = lastLog.length === 0 || 
          (new Date().getTime() - new Date(lastLog[0].timestamp).getTime()) >= logPowerInterval * 1000;

        if (shouldLog) {
          await this.devicesService.logDeviceEvent(
            deviceId,
            'power_reading',
            status,
            { power: status.power, voltage: status.voltage, current: status.current, energy: status.energy }
          );
        }
      }

      // Broadcast device update via WebSocket
      this.eventsGateway.broadcastDeviceUpdate(deviceId, status);
      
      this.logger.log(`  ✅ ${device.name} (${device.ip}) is online`);
      
      if (!device.online) {
        this.logger.log(`✅ Device ${device.name} (${device.ip}) came back online`);
        this.eventsGateway.broadcastDeviceOnline(deviceId, device.ip);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to poll device ${device.name} (${device.ip}): ${error.message}`);
      this.failedAttempts.set(deviceKey, failedCount + 1);

      // Increment failed attempts
      const newFailedCount = failedCount + 1;
      this.failedAttempts.set(deviceKey, newFailedCount);

      // Mark device as offline
      await this.devicesService.updateState(deviceId, {}, false);

      // Log connection lost event
      await this.devicesService.logDeviceEvent(deviceId, 'connection_lost', { error: error.message });

      // Broadcast device offline via WebSocket
      if (device.online) {
        this.eventsGateway.broadcastDeviceOffline(deviceId);
        this.logger.warn(`Device ${device.name} (${device.ip}) went offline`);
      }

      // Schedule retry if max failures reached
      if (newFailedCount >= this.maxFailedAttempts) {
        this.logger.warn(`Device ${device.name} failed ${newFailedCount} times, will retry in ${this.retryDelayMinutes} minutes`);
        setTimeout(() => {
          this.failedAttempts.delete(deviceKey);
        }, this.retryDelayMinutes * 60 * 1000);
      }
    }
  }

  async pollSingleDevice(deviceId: string): Promise<void> {
    const device = await this.devicesService.findOne(deviceId);
    await this.pollDevice(deviceId, device);
  }
}
