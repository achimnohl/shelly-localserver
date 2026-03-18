export interface DeviceStatus {
  online: boolean;
  switch?: {
    output: boolean;
    channel?: number;
  }[];
  power?: number;
  voltage?: number;
  current?: number;
  energy?: number;
  temperature?: number;
  [key: string]: any;
}

export interface DeviceInfo {
  model: string;
  generation: string;
  macAddress: string;
  firmwareVersion: string;
  hostname: string;
}

export interface IShellyAdapter {
  getStatus(ip: string): Promise<DeviceStatus>;
  setSwitch(ip: string, channel: number, state: boolean): Promise<void>;
  toggle(ip: string, channel: number): Promise<void>;
  getDeviceInfo(ip: string): Promise<DeviceInfo>;
}
