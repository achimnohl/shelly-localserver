# Shelly HomeServer - Power Monitoring Guide

## Overview

The Shelly HomeServer includes comprehensive power monitoring capabilities that query your Shelly devices for real-time power consumption data and store it in MongoDB for historical analysis.

## Features

### Real-Time Power Monitoring
- **Current Power**: Watts (W) being consumed
- **Voltage**: Current voltage (V)
- **Current**: Current draw in amperes (A)
- **Total Energy**: Cumulative energy consumption (Wh/kWh)
- **Last Update Timestamp**: When power data was last refreshed

### Automatic Data Collection
- **Scheduled Polling**: Queries all online devices every 5 minutes
- **Data Storage**: Stores measurements in MongoDB for historical analysis
- **Automatic Cleanup**: Removes measurements older than 30 days (configurable)

### Frontend UI Features
- **Card View**: Shows detailed power metrics for each device
- **List View**: Displays power consumption inline with device information
- **Manual Update**: "Update Power" button to query all devices on-demand
- **Color Coding**: Orange highlight for power information
- **Time Indicators**: Shows when power data was last updated

## Backend API Endpoints

### Query Power Data
```http
POST /api/power/query-all
```
Queries all online devices for current power consumption.

```http
POST /api/power/query/:deviceId
```
Query specific device for power data.

### Get Measurements
```http
GET /api/power/latest
```
Get latest power measurements for all devices.

```http
GET /api/power/measurements/:deviceId?startDate=&endDate=&limit=100
```
Get historical measurements for a device.

### Statistics
```http
GET /api/power/statistics/:deviceId?startDate=&endDate=
```
Get power consumption statistics (avg, max, min, total).

### Maintenance
```http
POST /api/power/cleanup?daysToKeep=30
```
Clean up old measurements.

## Using Power Monitoring

### In the UI

1. **View Power Data**
   - Open http://localhost:4200
   - Devices with power monitoring show power consumption automatically
   - Look for the ⚡ (bolt) icon

2. **Manual Update**
   - Click "Update Power" button in the toolbar
   - Queries all online devices immediately
   - Shows success notification with results

3. **View Details**
   - **Card View**: Shows power, voltage, current, total energy, and last update time
   - **List View**: Shows power inline with device state
   - Toggle between views using the view mode button

### Via PowerShell

Test the power monitoring API:
```powershell
.\test-power-monitoring.ps1
```

Query all devices:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/power/query-all" -Method Post
```

Get latest measurements:
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/power/latest" -Method Get
$response.measurements | Format-Table deviceName, power, voltage, timestamp
```

Get device statistics (last 24 hours):
```powershell
$deviceId = "your-device-id"
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/power/statistics/$deviceId" -Method Get
$response.statistics
```

## Supported Devices

Power monitoring works with Shelly devices that have power metering capabilities:

### Gen2/Gen3 Devices (RPC API)
- Shelly Plus 1PM, Plus 2PM
- Shelly Plus Plug S
- Shelly Pro 1PM, Pro 2PM, Pro 3EM
- And other Gen2/3 devices with PM (Power Monitoring)

### Gen1 Devices (REST API)
- Shelly 1PM, 2.5
- Shelly Plug, Plug S
- Shelly EM, 3EM
- And other Gen1 devices with power meters

## Data Storage

### PowerMeasurement Collection
Each measurement includes:
- `deviceId`: Reference to device
- `timestamp`: When measurement was taken
- `power`: Current power in watts
- `voltage`: Voltage in volts
- `current`: Current in amperes
- `powerFactor`: Power factor (0-1)
- `energyTotal`: Cumulative energy in Wh
- `channel`: Channel number (for multi-channel devices)
- `isOn`: Device state at measurement time

### Device Collection Updates
Device records are updated with:
- `currentPower`: Latest power reading
- `voltage`: Latest voltage
- `current`: Latest current
- `totalEnergy`: Total energy consumption
- `lastPowerUpdate`: Timestamp of last update

## Configuration

### Polling Interval
Default: Every 5 minutes

To change, edit `backend/src/app/polling/power-polling.service.ts`:
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)  // Change this
async pollDevices() {
  // ...
}
```

### Data Retention
Default: 30 days

To change, edit the cleanup call or pass `daysToKeep` parameter:
```typescript
await this.powerService.cleanupOldMeasurements(60); // Keep 60 days
```

### Cleanup Schedule
Default: Daily at 3 AM

To change, edit `backend/src/app/polling/power-polling.service.ts`:
```typescript
@Cron(CronExpression.EVERY_DAY_AT_3AM)  // Change this
async cleanupOldData() {
  // ...
}
```

## Troubleshooting

### No Power Data Showing

1. **Check device compatibility**: Only devices with power metering show data
2. **Verify device is online**: Power queries only work for online devices
3. **Check backend logs**: Look for power polling errors
4. **Manual trigger**: Click "Update Power" button to force query

### Power Data Not Updating

1. **Check scheduled polling**: Backend should poll every 5 minutes
2. **Verify MongoDB connection**: Ensure database is running
3. **Check backend logs**: Look for polling service errors
4. **Restart backend**: `npm run serve:backend`

### Inaccurate Readings

1. **Device calibration**: Some Shelly devices need calibration
2. **Network delays**: Temporary network issues can cause stale data
3. **Device firmware**: Ensure devices have latest firmware
4. **Manual refresh**: Use "Update Power" to get fresh data

## Future Enhancements

Planned features:
- Power consumption charts (daily/weekly/monthly)
- Cost calculation based on electricity rates
- Peak usage detection
- Power usage reports by room
- Energy usage trends and predictions
- Export data to CSV/Excel
- Alert when device exceeds power threshold
- Integration with home automation rules

## Technical Details

### Gen2/Gen3 Query
```typescript
const url = `http://${device.ip}/rpc/Switch.GetStatus?id=0`;
// Returns: { apower, voltage, current, pf, aenergy }
```

### Gen1 Query
```typescript
const url = `http://${device.ip}/status`;
// Returns: { meters: [{ power, voltage, current, total }] }
```

### Database Indexes
- `{ deviceId: 1, timestamp: -1 }` - For device history queries
- `{ timestamp: -1 }` - For cleanup operations

### Backend Services
- `PowerMonitoringService`: Core power querying and data management
- `PowerPollingService`: Scheduled automated polling
- `PowerController`: REST API endpoints

### Frontend Services
- `PowerMonitoringService`: HTTP client for power API
- `DeviceListComponent`: UI integration

## API Response Examples

### Query All Response
```json
{
  "success": true,
  "results": [
    {
      "deviceId": "507f1f77bcf86cd799439011",
      "success": true,
      "data": {
        "power": 45.2,
        "voltage": 230.5,
        "current": 0.196,
        "powerFactor": 1.0,
        "energyTotal": 1250.5,
        "isOn": true,
        "channel": 0
      }
    }
  ]
}
```

### Latest Measurements Response
```json
{
  "success": true,
  "count": 24,
  "measurements": [
    {
      "deviceId": "507f1f77bcf86cd799439011",
      "deviceName": "Kitchen Light",
      "timestamp": "2026-03-16T10:30:00.000Z",
      "power": 45.2,
      "voltage": 230.5,
      "current": 0.196,
      "powerFactor": 1.0,
      "energyTotal": 1250.5,
      "channel": 0,
      "isOn": true
    }
  ]
}
```

### Statistics Response
```json
{
  "success": true,
  "statistics": {
    "deviceId": "507f1f77bcf86cd799439011",
    "count": 288,
    "avgPower": 38.5,
    "maxPower": 52.3,
    "minPower": 0,
    "totalEnergy": 924.0,
    "startDate": "2026-03-15T10:00:00.000Z",
    "endDate": "2026-03-16T10:00:00.000Z"
  }
}
```
