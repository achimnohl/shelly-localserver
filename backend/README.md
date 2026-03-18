# Shelly HomeServer - Backend API

## Available Endpoints

### Devices API

#### Get All Devices
```http
GET /api/devices
```

#### Get Single Device
```http
GET /api/devices/:id
```

#### Create Device
```http
POST /api/devices
Content-Type: application/json

{
  "name": "shelly-flur",
  "ip": "192.168.0.185",
  "type": "relay",
  "generation": "gen1"
}
```

#### Update Device
```http
PUT /api/devices/:id
Content-Type: application/json

{
  "name": "New Device Name"
}
```

#### Delete Device
```http
DELETE /api/devices/:id
```

#### Control Device
```http
POST /api/devices/:id/control
Content-Type: application/json

{
  "action": "on",      // "on" | "off" | "toggle"
  "channel": 0         // optional, default: 0
}
```

#### Get Fresh Device Status
```http
GET /api/devices/:id/status
```

#### Get Device History
```http
GET /api/devices/:id/history
  ?startDate=2026-03-01T00:00:00.000Z
  &endDate=2026-03-14T23:59:59.999Z
  &limit=100
```

## Running the Backend

### Development Mode
```bash
npm run serve:backend
# or
nx serve backend
```

The backend will start on http://localhost:3000

### Prerequisites
- MongoDB running on localhost:27017
- Node.js 20+
- All dependencies installed (`npm install`)

### Environment Configuration

Edit `backend/.env` to configure:
- MongoDB connection string
- Server port
- Polling intervals
- Device timeouts

## Testing the API

### Example: Add a Device
```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "shelly-test",
    "ip": "192.168.0.185",
    "type": "relay",
    "generation": "gen1"
  }'
```

### Example: Control a Device
```bash
# Get device ID from previous step, then:
curl -X POST http://localhost:3000/api/devices/[DEVICE_ID]/control \
  -H "Content-Type: application/json" \
  -d '{"action": "toggle"}'
```

## Phase 1 Complete ✅

The following features are now implemented:
- ✅ MongoDB connection with Mongoose
- ✅ Device and DeviceLog schemas
- ✅ Multi-generation Shelly API adapter (Gen1, Gen2, Gen3, Plus)
- ✅ Device CRUD endpoints
- ✅ Device control endpoints (on/off/toggle)
- ✅ Device status refresh
- ✅ Historical data logging
- ✅ Device history retrieval

## Next Steps (Phase 2)

- Implement network discovery (mDNS scanning)
- Create polling service for automatic status updates
- Add WebSocket gateway for real-time updates
- Build Angular frontend
