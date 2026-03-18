import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { PowerMonitoringService } from '../services/power-monitoring.service';

@Controller('power')
export class PowerController {
  private readonly logger = new Logger(PowerController.name);

  constructor(private readonly powerService: PowerMonitoringService) {}

  /**
   * Query power data for a specific device
   */
  @Post('query/:deviceId')
  async queryDevice(@Param('deviceId') deviceId: string) {
    this.logger.log(`⚡ Querying power for device: ${deviceId}`);
    try {
      const data = await this.powerService.queryDevicePower(deviceId);
      return { success: true, data };
    } catch (error) {
      this.logger.error(`❌ Failed to query power: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Query power data for all online devices
   */
  @Post('query-all')
  async queryAll() {
    this.logger.log(`⚡ Querying power for all devices`);
    try {
      const results = await this.powerService.queryAllDevices();
      return { success: true, results };
    } catch (error) {
      this.logger.error(`❌ Failed to query all devices: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get power measurements for a device
   */
  @Get('measurements/:deviceId')
  async getMeasurements(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`📊 Getting measurements for device: ${deviceId}`);
    
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : 100;

    const measurements = await this.powerService.getDeviceMeasurements(
      deviceId,
      start,
      end,
      limitNum,
    );

    return { success: true, count: measurements.length, measurements };
  }

  /**
   * Get latest power measurements for all devices
   */
  @Get('latest')
  async getLatest() {
    this.logger.log(`📊 Getting latest measurements for all devices`);
    const measurements = await this.powerService.getLatestMeasurements();
    return { success: true, count: measurements.length, measurements };
  }

  /**
   * Get power consumption statistics for a device
   */
  @Get('statistics/:deviceId')
  async getStatistics(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log(`📈 Getting statistics for device: ${deviceId}`);
    
    // Default to last 24 hours if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const stats = await this.powerService.getDeviceStatistics(deviceId, start, end);
    return { success: true, statistics: stats };
  }

  /**
   * Clean up old measurements
   */
  @Post('cleanup')
  async cleanup(@Query('daysToKeep') daysToKeep?: string) {
    const days = daysToKeep ? parseInt(daysToKeep, 10) : 30;
    this.logger.log(`🧹 Cleaning up measurements older than ${days} days`);
    
    const deleted = await this.powerService.cleanupOldMeasurements(days);
    return { success: true, deleted };
  }
}
