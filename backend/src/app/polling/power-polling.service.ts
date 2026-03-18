import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PowerMonitoringService } from '../services/power-monitoring.service';

@Injectable()
export class PowerPollingService implements OnModuleInit {
  private readonly logger = new Logger(PowerPollingService.name);
  private isPolling = false;

  constructor(private readonly powerService: PowerMonitoringService) {}

  onModuleInit() {
    this.logger.log('🔌 Power Polling Service initialized');
  }

  /**
   * Poll all devices every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollDevices() {
    if (this.isPolling) {
      this.logger.warn('⚠️ Previous polling still in progress, skipping...');
      return;
    }

    this.isPolling = true;
    this.logger.log('⚡ Starting scheduled power polling...');

    try {
      const results = await this.powerService.queryAllDevices();
      const successful = results.filter(r => r.success).length;
      this.logger.log(`✅ Completed power polling: ${successful}/${results.length} devices`);
    } catch (error) {
      this.logger.error(`❌ Power polling failed: ${error.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Clean up old measurements daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldData() {
    this.logger.log('🧹 Starting scheduled cleanup of old power measurements...');
    try {
      const deleted = await this.powerService.cleanupOldMeasurements(30);
      this.logger.log(`✅ Cleanup complete: ${deleted} old measurements removed`);
    } catch (error) {
      this.logger.error(`❌ Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerPolling() {
    this.logger.log('🔧 Manually triggering power polling...');
    await this.pollDevices();
  }
}
