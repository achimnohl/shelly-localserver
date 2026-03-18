# Shelly HomeServer Architecture

## Overview

The Shelly HomeServer is a local, self-hosted solution for managing and monitoring Shelly IoT devices without relying on cloud services. The system provides real-time device control, status monitoring, historical analytics, and auto-discovery capabilities for 20+ Shelly devices across multiple generations (Gen1, Gen2, Gen3, Plus series).

**Key Characteristics:**
- **Local-first**: All operations happen within the home network
- **Real-time**: WebSocket-based live updates
- **Scalable**: Designed for 20+ devices with room to grow
- **Offline-resilient**: Gracefully handles disconnected devices (16 of 24 typically offline)
- **Multi-generation**: Supports Gen1, Gen2, Gen3, and Plus series Shelly devices

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Angular SPA (Port 4200)                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Device   │ │ Control  │ │Analytics │ │Discovery │  │   │
│  │  │ List     │ │ Panel    │ │Dashboard │ │  UI      │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │  WebSocket Client  │  HTTP Client (REST API)   │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS/WS
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            NestJS Application (Port 3000)                │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │              REST API Controllers                 │  │   │
│  │  │  - DevicesController                              │  │   │
│  │  │  - AnalyticsController                            │  │   │
│  │  │  - DiscoveryController                            │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │           WebSocket Gateway (Socket.IO)           │  │   │
│  │  │  - Real-time device status broadcasts            │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │              Business Logic Services              │  │   │
│  │  │  - DevicesService                                 │  │   │
│  │  │  - ShellyApiService (Multi-gen adapter)          │  │   │
│  │  │  - PollingService (Scheduled tasks)              │  │   │
│  │  │  - DiscoveryService (mDNS scanner)               │  │   │
│  │  │  - LoggingService (Historical data)              │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │         Data Access Layer (Mongoose)              │  │   │
│  │  │  - Device Schema                                  │  │   │
│  │  │  - DeviceLog Schema                               │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────┬───────────────────────┬─────────────────────────┘
                │                       │
                │ HTTP                  │ mDNS/HTTP
                ↓                       ↓
┌───────────────────────────┐  ┌──────────────────────────────────┐
│     MongoDB Database      │  │    Shelly Devices (192.168.0.x)  │
│   (localhost:27017)       │  │                                   │
│  ┌─────────────────────┐ │  │  ┌────────────────────────────┐  │
│  │  devices            │ │  │  │ Gen1: /status, /relay/N    │  │
│  │  - id, name, ip     │ │  │  │ Gen2: /rpc/Shelly.*        │  │
│  │  - type, model      │ │  │  │ Gen3: /rpc/Shelly.*        │  │
│  │  - lastSeen, state  │ │  │  │ Plus: /rpc/Shelly.*        │  │
│  └─────────────────────┘ │  │  └────────────────────────────┘  │
│  ┌─────────────────────┐ │  │  • 24 devices total              │
│  │  device_logs        │ │  │  • ~8 typically online           │
│  │  - deviceId         │ │  │  • Lights, Plugs, Sensors        │
│  │  - timestamp        │ │  │  • Smoke detectors, BLE gateway  │
│  │  - state, power     │ │  └──────────────────────────────────┘
│  └─────────────────────┘ │
└───────────────────────────┘
```

## Component Architecture

### Frontend (Angular)

**Core Modules:**
- **Devices Module**: Device list, control panels, CRUD forms
- **Analytics Module**: Historical data visualization, charts, filters
- **Discovery Module**: Network scanning UI, device onboarding
- **Shared Module**: Common components, pipes, directives

**Services:**
- `DeviceService`: REST API communication for device operations
- `WebSocketService`: Real-time status updates
- `AnalyticsService`: Historical data fetching and aggregation

**State Management:**
- RxJS BehaviorSubjects for device state
- Real-time updates via WebSocket subscriptions

### Backend (NestJS)

**Modules:**

1. **Devices Module**
   - Controllers: CRUD operations, device control endpoints
   - Service: Business logic for device management
   - Schema: Mongoose models for Device entity

2. **Shelly Module**
   - `ShellyApiService`: HTTP client for Shelly device communication
   - Device generation adapter pattern:
     - `Gen1Adapter`: /status, /relay/N, /light/N endpoints
     - `Gen2Adapter`: /rpc/Shelly.GetStatus, /rpc/Switch.Set
     - `Gen3Adapter`: Same as Gen2 with enhanced features
     - `PlusAdapter`: Plus series specific endpoints

3. **Discovery Module**
   - `DiscoveryService`: mDNS/network scanning
   - Uses `multicast-dns` for device discovery
   - Identifies devices by hostname pattern: `shelly*`, `shellyplus*`, `shelly1*`

4. **Polling Module**
   - `PollingService`: Scheduled device status checks
   - Configurable interval (30-60s via .env)
   - Retry logic for offline devices
   - Circuit breaker pattern for failing devices

5. **Events Module**
   - `EventsGateway`: WebSocket server (Socket.IO)
   - Broadcasts device state changes to connected clients
   - Rooms per device for targeted updates

6. **Analytics Module**
   - Controllers: Historical data endpoints
   - Service: Query aggregation, time-series data
   - Schema: DeviceLog entity with time-series optimization

7. **Config Module**
   - Environment configuration via `@nestjs/config`
   - Validates MongoDB URI, server port, polling interval

## Data Flow

### Device Control Flow

```
User clicks "Turn On" in UI
    ↓
Angular Component → DeviceService.controlDevice()
    ↓
HTTP POST /api/devices/:id/control { action: 'on' }
    ↓
NestJS DevicesController → DevicesService.controlDevice()
    ↓
ShellyApiService.setDeviceState() → Adapter selects API
    ↓
HTTP request to device (e.g., http://192.168.0.185/relay/0?turn=on)
    ↓
Device responds with new state
    ↓
Update MongoDB: devices.state = 'on', lastSeen = now()
    ↓
Log to device_logs collection
    ↓
EventsGateway broadcasts 'device:update' via WebSocket
    ↓
All connected Angular clients receive update → UI refreshes
```

### Polling Flow

```
ScheduledTask triggers every 60s
    ↓
PollingService.pollAllDevices()
    ↓
For each device in MongoDB:
    ↓
    ShellyApiService.getDeviceStatus(device.ip)
    ↓
    HTTP GET to device (e.g., /rpc/Shelly.GetStatus or /status)
    ↓
    If successful:
        - Update device.state, device.lastSeen in MongoDB
        - If state changed: Log to device_logs
        - Broadcast via WebSocket
    ↓
    If failed (timeout, offline):
        - Mark device.lastSeen with current timestamp
        - Set device.online = false
        - Broadcast offline status
```

### Auto-Discovery Flow

```
User clicks "Scan Network" in Discovery UI
    ↓
Angular → DiscoveryService.scan()
    ↓
HTTP POST /api/discovery/scan
    ↓
NestJS DiscoveryService.scanNetwork()
    ↓
mDNS query for _http._tcp.local services
    ↓
Filter by hostname pattern: shelly*, shellyplus*
    ↓
For each discovered device:
    - Probe /shelly or /rpc/Shelly.GetDeviceInfo
    - Extract: model, MAC address, firmware version
    - Check if already in MongoDB (by MAC)
    ↓
Return list of new devices to frontend
    ↓
User selects devices → Add to MongoDB
```

## Technology Stack

### Frontend
- **Framework**: Angular 18+ with standalone components
- **UI Library**: Angular Material
- **Charts**: Chart.js or ngx-charts
- **HTTP Client**: Angular HttpClient
- **WebSocket**: Socket.IO client
- **Build Tool**: Nx

### Backend
- **Framework**: NestJS 10+
- **Database ODM**: Mongoose
- **WebSocket**: Socket.IO (via `@nestjs/websockets`)
- **HTTP Client**: Axios (via `@nestjs/axios`)
- **Scheduling**: `@nestjs/schedule`
- **Config**: `@nestjs/config`
- **Device Discovery**: `multicast-dns`
- **Build Tool**: Nx

### Infrastructure
- **Database**: MongoDB 6.0+ (localhost:27017)
- **Reverse Proxy**: Nginx (Docker deployment)
- **Containerization**: Docker & Docker Compose

## Database Schema

### devices Collection

```typescript
{
  _id: ObjectId,
  name: string,              // e.g., "shelly-flur", "shelly-waschmaschine-strom"
  ip: string,                // e.g., "192.168.0.185"
  type: string,              // "plug", "relay", "dimmer", "sensor", "smoke_detector"
  model: string,             // e.g., "Shelly 1PM Mini Gen3", "Shelly Plus Smoke"
  generation: string,        // "gen1", "gen2", "gen3", "plus"
  macAddress: string,        // Unique identifier
  firmwareVersion: string,   // e.g., "1.2.3"
  online: boolean,           // Current connectivity status
  state: object,             // Device-specific state (on/off, brightness, temperature, etc.)
  capabilities: string[],    // ["switch", "power_meter", "temperature"]
  lastSeen: Date,            // Last successful communication
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - ip (unique)
// - macAddress (unique)
// - online, lastSeen (for filtering)
```

### device_logs Collection

```typescript
{
  _id: ObjectId,
  deviceId: ObjectId,        // Reference to devices._id
  timestamp: Date,           // Time-series primary key
  eventType: string,         // "state_change", "power_reading", "connection_lost"
  state: object,             // Snapshot of device state
  metrics: {                 // Optional metrics
    power: number,           // Watts
    voltage: number,         // Volts
    current: number,         // Amps
    energy: number,          // Wh
    temperature: number      // °C
  },
  metadata: object           // Additional context
}

// Indexes:
// - deviceId, timestamp (compound, for time-series queries)
// - timestamp (TTL index for data retention - optional)
```

## API Design

### REST Endpoints

#### Devices

```
GET    /api/devices                  - List all devices
GET    /api/devices/:id              - Get device details
POST   /api/devices                  - Add device manually
PUT    /api/devices/:id              - Update device (name, settings)
DELETE /api/devices/:id              - Remove device
POST   /api/devices/:id/control      - Control device (toggle, set state)
GET    /api/devices/:id/status       - Fetch fresh status from device
```

#### Discovery

```
POST   /api/discovery/scan           - Scan network for devices
GET    /api/discovery/results        - Get last scan results
```

#### Analytics

```
GET    /api/analytics/devices/:id/history
       ?startDate=2026-03-01&endDate=2026-03-14&metric=power
       - Get historical data
       
GET    /api/analytics/devices/:id/statistics
       ?period=daily|weekly|monthly
       - Get aggregated statistics
       
GET    /api/analytics/summary        - System-wide analytics
```

### WebSocket Events

#### Client → Server
```
connect                               - Establish connection
disconnect                            - Close connection
subscribe:device                      - Subscribe to device updates
  { deviceId: string }
```

#### Server → Client
```
device:update                         - Device state changed
  { deviceId, state, timestamp }
  
device:online                         - Device came online
  { deviceId, ip }
  
device:offline                        - Device went offline
  { deviceId }
  
system:stats                          - System statistics
  { totalDevices, onlineDevices, offlineDevices }
```

## Shelly Device Integration
\\
### API Compatibility Matrix

| Generation | API Type | Status Endpoint | Control Endpoint | Example |
|------------|----------|-----------------|------------------|---------|
| Gen 1      | REST     | /status         | /relay/N?turn=on | Shelly 1, 1PM, Plug S |
| Gen 2      | RPC/JSON | /rpc/Shelly.GetStatus | /rpc/Switch.Set | Shelly Plus 1, Plus 1PM |
| Gen 3      | RPC/JSON | /rpc/Shelly.GetStatus | /rpc/Switch.Set | Shelly 1 Mini Gen3 |
| Plus       | RPC/JSON | /rpc/Shelly.GetStatus | Device-specific | Shelly Plus Smoke |

### Adapter Pattern Implementation

```typescript
interface IShellyAdapter {
  getStatus(ip: string): Promise<DeviceStatus>;
  setSwitch(ip: string, index: number, state: boolean): Promise<void>;
  getDeviceInfo(ip: string): Promise<DeviceInfo>;
}

class Gen1Adapter implements IShellyAdapter {
  async getStatus(ip: string) {
    const response = await axios.get(`http://${ip}/status`);
    return this.normalizeGen1Status(response.data);
  }
  
  async setSwitch(ip: string, index: number, state: boolean) {
    await axios.get(`http://${ip}/relay/${index}?turn=${state ? 'on' : 'off'}`);
  }
}

class Gen2Adapter implements IShellyAdapter {
  async getStatus(ip: string) {
    const response = await axios.post(`http://${ip}/rpc/Shelly.GetStatus`);
    return this.normalizeGen2Status(response.data);
  }
  
  async setSwitch(ip: string, index: number, state: boolean) {
    await axios.post(`http://${ip}/rpc/Switch.Set`, {
      id: index,
      on: state
    });
  }
}
```

### Error Handling

- **Connection timeout**: 5 second timeout, mark device offline
- **HTTP 404/500**: Log error, schedule retry after 5 minutes
- **Invalid response**: Log malformed data, alert user
- **Circuit breaker**: After 3 consecutive failures, pause polling for 15 minutes

## Deployment Architecture

### Development

```
Terminal 1: npx nx serve backend     → http://localhost:3000
Terminal 2: npx nx serve frontend    → http://localhost:4200
Terminal 3: mongod                   → localhost:27017
```

### Production (Docker Compose)

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/shellydb
      - PORT=3000
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo-data:
```

## Security Considerations

- **Network isolation**: Runs entirely on local network (192.168.0.x)
- **No external dependencies**: No cloud APIs, no telemetry
- **No authentication** (Phase 1): Single-user assumption
  - Future: Add basic auth or JWT tokens
- **Device access**: Direct HTTP to devices (no TLS on Shelly devices)
- **Input validation**: Sanitize all user inputs (device names, IPs)
- **Rate limiting**: Prevent polling abuse

## Performance Considerations

- **Database indexing**: Compound indexes on deviceId + timestamp
- **Polling optimization**: Batch device queries, concurrent HTTP requests
- **WebSocket scaling**: Single instance supports 50-100 concurrent clients
- **Time-series data**: Consider MongoDB time-series collections for device_logs
- **Caching**: Cache device state in memory (Redis future option)

## Configuration (.env)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/shellydb

# Server
PORT=3000
NODE_ENV=development

# Polling
POLLING_INTERVAL_SECONDS=60
DEVICE_TIMEOUT_SECONDS=5
RETRY_FAILED_DEVICES_MINUTES=15

# Discovery
MDNS_ENABLED=true
DISCOVERY_SUBNET=192.168.0.0/24

# WebSocket
WS_CORS_ORIGIN=http://localhost:4200

# Analytics
DATA_RETENTION_DAYS=365
LOG_STATE_CHANGES=true
LOG_POWER_READINGS_INTERVAL_SECONDS=300
```


## Future Enhancements

1. **Authentication**: Basic auth or OAuth for multi-user support
2. **Scheduling**: Time-based automation (turn lights on at sunset)
3. **Scenes**: Group device actions (e.g., "Movie Mode")
4. **Notifications**: Push alerts for smoke detectors, offline devices
5. **Energy dashboard**: Visualize power consumption, cost estimation
6. **Mobile app**: React Native or PWA
7. **Voice control**: Integrate with local voice assistants
8. **Backup/restore**: Export/import device configurations
9. **Firmware updates**: Trigger OTA updates for Shelly devices
10. **BLE integration**: Use Shelly BLE Gateway for BLE devices

## Known Limitations

- No cloud backup/remote access (by design)
- Single-user only (Phase 1)
- No HTTPS on Shelly devices (hardware limitation)
- Polling-based updates (WebSocket push from devices not supported by all models)
- Limited to home network (no VPN/tunnel setup in Phase 1)
- ~67% of devices typically offline (based on scan)

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-14  
**Architecture Status**: Development - Phase 0 Complete
