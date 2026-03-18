import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from '../devices/schemas/device.schema';
import { PowerMeasurement, PowerMeasurementDocument } from '../models/power-measurement.schema';
import axios from 'axios';

@Injectable()
export class PowerMonitoringService {
  private readonly logger = new Logger(PowerMonitoringService.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(PowerMeasurement.name) private powerMeasurementModel: Model<PowerMeasurementDocument>,
  ) {}

  /**
   * Query a single Shelly device for power data
   */
  async queryDevicePower(deviceId: string): Promise<any> {
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    this.logger.debug(`⚡ Querying power data for ${device.name} (${device.ip})`);

    try {
      let powerData;
      
      if (device.generation === 'gen2' || device.generation === 'gen3') {
        // Gen2/Gen3 use RPC API
        powerData = await this.queryGen2Power(device);
      } else {
        // Gen1 uses REST API
        powerData = await this.queryGen1Power(device);
      }

      // Update device with latest power metrics
      await this.deviceModel.findByIdAndUpdate(deviceId, {
        currentPower: powerData.power,
        voltage: powerData.voltage,
        current: powerData.current,
        totalEnergy: powerData.energyTotal,
        lastPowerUpdate: new Date(),
      });

      // Store measurement in history
      const measurement = new this.powerMeasurementModel({
        deviceId: device._id,
        timestamp: new Date(),
        power: powerData.power,
        voltage: powerData.voltage,
        current: powerData.current,
        powerFactor: powerData.powerFactor,
        energyTotal: powerData.energyTotal,
        channel: powerData.channel || 0,
        isOn: powerData.isOn,
      });

      await measurement.save();

      this.logger.log(`✅ Power data saved for ${device.name}: ${powerData.power}W`);
      return powerData;

    } catch (error) {
      this.logger.error(`❌ Failed to query power for ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query Gen2/Gen3 device using RPC API
   */
  private async queryGen2Power(device: Device): Promise<any> {
    const url = `http://${device.ip}/rpc/Switch.GetStatus?id=0`;
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    return {
      power: data.apower || 0,
      voltage: data.voltage || 0,
      current: data.current || 0,
      powerFactor: data.pf || 0,
      energyTotal: data.aenergy?.total || 0,
      isOn: data.output || false,
      channel: 0,
    };
  }

  /**
   * Query Gen1 device using REST API
   */
  private async queryGen1Power(device: Device): Promise<any> {
    const url = `http://${device.ip}/status`;
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    // Gen1 devices have meters array
    const meter = data.meters?.[0] || {};
    const relay = data.relays?.[0] || {};

    return {
      power: meter.power || 0,
      voltage: meter.voltage || 0,
      current: meter.current || 0,
      energyTotal: meter.total || 0,
      isOn: relay.ison || false,
      channel: 0,
    };
  }

  /**
   * Query all online devices for power data
   */
  async queryAllDevices(): Promise<any> {
    const devices = await this.deviceModel.find({ online: true });
    this.logger.log(`🔍 Querying power data for ${devices.length} online devices`);

    const results = [];
    for (const device of devices) {
      try {
        const powerData = await this.queryDevicePower(device._id.toString());
        results.push({ deviceId: device._id, success: true, data: powerData });
      } catch (error) {
        results.push({ deviceId: device._id, success: false, error: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    this.logger.log(`✅ Successfully queried ${successful}/${devices.length} devices`);

    return results;
  }

  /**
   * Get power measurements for a device
   */
  async getDeviceMeasurements(
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<PowerMeasurement[]> {
    const query: any = { deviceId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    return this.powerMeasurementModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get latest power measurements for all devices
   */
  async getLatestMeasurements(): Promise<any> {
    const devices = await this.deviceModel.find({ online: true });
    const measurements = [];

    for (const device of devices) {
      const latest = await this.powerMeasurementModel
        .findOne({ deviceId: device._id })
        .sort({ timestamp: -1 })
        .exec();

      if (latest) {
        measurements.push({
          deviceId: device._id,
          deviceName: device.name,
          ...latest.toObject(),
        });
      }
    }

    return measurements;
  }

  /**
   * Get power consumption statistics for a device
   */
  async getDeviceStatistics(
    deviceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const measurements = await this.powerMeasurementModel
      .find({
        deviceId,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: 1 })
      .exec();

    if (measurements.length === 0) {
      return { deviceId, count: 0, avgPower: 0, maxPower: 0, minPower: 0 };
    }

    const powers = measurements.map(m => m.power || 0);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const maxPower = Math.max(...powers);
    const minPower = Math.min(...powers);

    // Calculate total energy consumption (Wh)
    // Simple approximation: sum of power readings * time interval
    const totalEnergy = measurements.reduce((sum, m) => sum + (m.power || 0), 0) / measurements.length;

    return {
      deviceId,
      count: measurements.length,
      avgPower: Math.round(avgPower * 100) / 100,
      maxPower: Math.round(maxPower * 100) / 100,
      minPower: Math.round(minPower * 100) / 100,
      totalEnergy: Math.round(totalEnergy * 100) / 100,
      startDate,
      endDate,
    };
  }

  /**
   * Clean up old measurements
   */
  async cleanupOldMeasurements(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.powerMeasurementModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    this.logger.log(`🧹 Cleaned up ${result.deletedCount} old power measurements`);
    return result.deletedCount;
  }
}
