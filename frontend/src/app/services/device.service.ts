import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Device,
  DeviceStatus,
  CreateDeviceDto,
  ControlDeviceDto,
  DiscoveredDevice,
} from '../models/device.model';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private apiUrl = '/api/devices';
  private discoveryUrl = '/api/discovery';

  constructor(private http: HttpClient) {}

  // Device CRUD operations
  getAllDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.apiUrl}?includeMetadata=true`);
  }

  getDevice(id: string): Observable<Device> {
    return this.http.get<Device>(`${this.apiUrl}/${id}`);
  }

  createDevice(device: CreateDeviceDto): Observable<Device> {
    return this.http.post<Device>(this.apiUrl, device);
  }

  updateDevice(id: string, device: Partial<Device>): Observable<Device> {
    return this.http.put<Device>(`${this.apiUrl}/${id}`, device);
  }

  updateDeviceMetadata(id: string, metadata: {
    name?: string;
    roomName?: string;
    category?: string;
    relayUsage?: string;
  }): Observable<Device> {
    return this.http.put<Device>(`${this.apiUrl}/${id}/metadata`, metadata);
  }

  deleteDevice(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Device control
  controlDevice(id: string, control: ControlDeviceDto): Observable<Device> {
    return this.http.post<Device>(`${this.apiUrl}/${id}/control`, control);
  }

  getDeviceStatus(id: string): Observable<DeviceStatus> {
    return this.http.get<DeviceStatus>(`${this.apiUrl}/${id}/status`);
  }

  // Device history
  getDeviceHistory(
    id: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<any[]>(`${this.apiUrl}/${id}/history`, { params });
  }

  // Discovery
  scanNetwork(): Observable<{ found: number; devices: DiscoveredDevice[] }> {
    return this.http.post<{ found: number; devices: DiscoveredDevice[] }>(
      `${this.discoveryUrl}/scan`,
      {}
    );
  }

  scanSubnet(): Observable<{ found: number; devices: DiscoveredDevice[] }> {
    return this.http.post<{ found: number; devices: DiscoveredDevice[] }>(
      `${this.discoveryUrl}/scan-subnet`,
      {}
    );
  }

  scanAndSave(): Observable<{ discovered: number; saved: number; skipped: number; errors: number; devices: Device[] }> {
    return this.http.post<{ discovered: number; saved: number; skipped: number; errors: number; devices: Device[] }>(
      `${this.discoveryUrl}/scan-and-save`,
      {}
    );
  }

  scanSubnetAndSave(): Observable<{ discovered: number; saved: number; skipped: number; errors: number; devices: Device[] }> {
    return this.http.post<{ discovered: number; saved: number; skipped: number; errors: number; devices: Device[] }>(
      `${this.discoveryUrl}/scan-subnet-and-save`,
      {}
    );
  }
}
