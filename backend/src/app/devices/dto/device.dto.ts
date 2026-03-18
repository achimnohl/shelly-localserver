export class CreateDeviceDto {
  name?: string; // Optional: Will be stored in metadata instead
  ip: string;
  type: string;
  model?: string;
  generation: string;
  macAddress?: string;
  firmwareVersion?: string;
  capabilities?: string[];
}

export class UpdateDeviceDto {
  name?: string;
  ip?: string;
  type?: string;
  model?: string;
  generation?: string;
  firmwareVersion?: string;
  capabilities?: string[];
}

export class ControlDeviceDto {
  action: 'on' | 'off' | 'toggle' | 'set';
  channel?: number;
  value?: any;
}
