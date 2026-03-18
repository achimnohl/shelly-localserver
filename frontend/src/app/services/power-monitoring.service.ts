import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PowerMeasurement {
  _id?: string;
  deviceId: string;
  deviceName?: string;
  timestamp: Date;
  power?: number;
  voltage?: number;
  current?: number;
  powerFactor?: number;
  energyTotal?: number;
  channel: number;
  isOn?: boolean;
}

export interface PowerStatistics {
  deviceId: string;
  count: number;
  avgPower: number;
  maxPower: number;
  minPower: number;
  totalEnergy: number;
  startDate: Date;
  endDate: Date;
}

@Injectable({
  providedIn: 'root',
})
export class PowerMonitoringService {
  private apiUrl = '/api/power';

  constructor(private http: HttpClient) {}

  /**
   * Query power data for a specific device
   */
  queryDevice(deviceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/query/${deviceId}`, {});
  }

  /**
   * Query power data for all online devices
   */
  queryAllDevices(): Observable<any> {
    return this.http.post(`${this.apiUrl}/query-all`, {});
  }

  /**
   * Get power measurements for a device
   */
  getDeviceMeasurements(
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Observable<{ success: boolean; count: number; measurements: PowerMeasurement[] }> {
    let params = new HttpParams().set('limit', limit.toString());
    
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<{ success: boolean; count: number; measurements: PowerMeasurement[] }>(
      `${this.apiUrl}/measurements/${deviceId}`,
      { params }
    );
  }

  /**
   * Get latest power measurements for all devices
   */
  getLatestMeasurements(): Observable<{ success: boolean; count: number; measurements: PowerMeasurement[] }> {
    return this.http.get<{ success: boolean; count: number; measurements: PowerMeasurement[] }>(
      `${this.apiUrl}/latest`
    );
  }

  /**
   * Get power consumption statistics for a device
   */
  getDeviceStatistics(
    deviceId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<{ success: boolean; statistics: PowerStatistics }> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<{ success: boolean; statistics: PowerStatistics }>(
      `${this.apiUrl}/statistics/${deviceId}`,
      { params }
    );
  }

  /**
   * Clean up old measurements
   */
  cleanupOldMeasurements(daysToKeep: number = 30): Observable<{ success: boolean; deleted: number }> {
    return this.http.post<{ success: boolean; deleted: number }>(
      `${this.apiUrl}/cleanup`,
      {},
      { params: new HttpParams().set('daysToKeep', daysToKeep.toString()) }
    );
  }
}
