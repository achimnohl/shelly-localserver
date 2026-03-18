import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = 0;

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`🔌 WebSocket client connected: ${client.id} (Total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`🔌 WebSocket client disconnected: ${client.id} (Total: ${this.connectedClients})`);
  }

  broadcastDeviceUpdate(deviceId: string, state: any) {
    this.logger.debug(`📡 Broadcasting device update for ${deviceId}`);
    this.server.emit('device:update', {
      deviceId,
      state,
      timestamp: new Date(),
    });
  }

  broadcastDeviceOnline(deviceId: string, ip: string) {
    this.server.emit('device:online', {
      deviceId,
      ip,
      timestamp: new Date(),
    });
  }

  broadcastDeviceOffline(deviceId: string) {
    this.server.emit('device:offline', {
      deviceId,
      timestamp: new Date(),
    });
  }

  broadcastSystemStats(stats: { totalDevices: number; onlineDevices: number; offlineDevices: number }) {
    this.server.emit('system:stats', {
      ...stats,
      timestamp: new Date(),
    });
  }

  broadcastDeviceDiscovered(device: any) {
    this.server.emit('device:discovered', {
      device,
      timestamp: new Date(),
    });
  }
}
