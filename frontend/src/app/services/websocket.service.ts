import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export interface DeviceUpdateEvent {
  deviceId: string;
  state: any;
  timestamp: Date;
}

export interface DeviceOnlineEvent {
  deviceId: string;
  ip: string;
  timestamp: Date;
}

export interface DeviceOfflineEvent {
  deviceId: string;
  timestamp: Date;
}

export interface SystemStatsEvent {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  onDeviceUpdate(): Observable<DeviceUpdateEvent> {
    return new Observable((observer) => {
      this.socket.on('device:update', (data: DeviceUpdateEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('device:update');
      };
    });
  }

  onDeviceOnline(): Observable<DeviceOnlineEvent> {
    return new Observable((observer) => {
      this.socket.on('device:online', (data: DeviceOnlineEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('device:online');
      };
    });
  }

  onDeviceOffline(): Observable<DeviceOfflineEvent> {
    return new Observable((observer) => {
      this.socket.on('device:offline', (data: DeviceOfflineEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('device:offline');
      };
    });
  }

  onSystemStats(): Observable<SystemStatsEvent> {
    return new Observable((observer) => {
      this.socket.on('system:stats', (data: SystemStatsEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('system:stats');
      };
    });
  }
}
