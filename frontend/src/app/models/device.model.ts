export interface DeviceMetadata {
  name?: string;
  roomId?: string;
  roomName?: string;
  category?: string;
  applianceType?: number;
  relayUsage?: string;
  position?: number;
}

export interface Device {
  _id?: string;
  name: string;
  ip: string;
  type: string;
  model?: string;
  generation: string;
  macAddress?: string;
  firmwareVersion?: string;
  online: boolean;
  state: any;
  capabilities: string[];
  lastSeen: Date;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: DeviceMetadata;
  // Power monitoring metrics
  currentPower?: number;
  voltage?: number;
  current?: number;
  totalEnergy?: number;
  lastPowerUpdate?: Date;
}

export interface DeviceStatus {
  online: boolean;
  switch?: Array<{
    output: boolean;
    channel?: number;
  }>;
  power?: number;
  voltage?: number;
  current?: number;
  energy?: number;
  temperature?: number;
  [key: string]: any;
}

export interface CreateDeviceDto {
  name: string;
  ip: string;
  type: string;
  model?: string;
  generation: string;
  macAddress?: string;
  firmwareVersion?: string;
  capabilities?: string[];
}

export interface ControlDeviceDto {
  action: 'on' | 'off' | 'toggle';
  channel?: number;
  value?: any;
}

export interface DiscoveredDevice {
  ip: string;
  hostname: string;
  model?: string;
  generation?: string;
  macAddress?: string;
  firmwareVersion?: string;
}
