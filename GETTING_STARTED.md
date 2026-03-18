# Getting Started with Shelly HomeServer

## Quick Start

### 1. Start the Application

Both frontend and backend should be running:
- **Backend**: http://localhost:3000/api
- **Frontend**: http://localhost:4200

### 2. Discover Your Devices

The database starts empty. You need to discover your Shelly devices first.

#### Option A: Use the Frontend (Easiest!)
Open http://localhost:4200 and click the **"Discover & Add Devices"** button. This will:
1. Scan your entire network (192.168.0.1-254)
2. Automatically save all found Shelly devices to the database
3. Take ~30-60 seconds to complete

The devices will appear in the UI immediately after discovery completes!

#### Option B: Command Line - Subnet Scan & Save
Scans all IPs in the 192.168.0.0/24 subnet AND saves them to the database:

```bash
curl -X POST http://localhost:3000/api/discovery/scan-subnet-and-save
```

This will take ~30-60 seconds as it probes each IP address from 192.168.0.1 to 192.168.0.254, then automatically saves all discovered devices.

#### Option C: Command Line - mDNS Scan & Save
Use the discovery endpoint to automatically find and save Shelly devices on your network:

```bash
curl -X POST http://localhost:3000/api/discovery/scan-and-save
```

⚠️ **Note**: mDNS discovery may not work on all networks. If you don't find any devices, use Option A or B.

#### Option D: Manual Device Addition
If you know the IP addresses of your Shelly devices, add them manually:
If you know the IP addresses of your Shelly devices, add them manually:

```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.0.185",
    "name": "Living Room Light",
    "type": "shelly_plug"
  }'
```

The system will automatically probe the device to detect its model and generation.

### 3. View Your Devices

Once devices are discovered or added, they'll appear in the frontend at http://localhost:4200

Or via API:
```bash
curl http://localhost:3000/api/devices
```

### 3.5 Enrich Device Data with Shelly Cloud Metadata (Optional)

You can import metadata from Shelly Cloud to enrich your devices with:
- **Room names** (e.g., "Flur", "Küche", "Badezimmer")
- **Categories** (relay, sensor, power_meter, gateway)
- **Appliance types** and usage information
- **Room organization** for better device grouping

#### Quick Import:

1. Save your Shelly Cloud JSON data to `shelly-cloud-data.json`
2. Run the import script:
   ```powershell
   .\import-metadata.ps1
   ```

Or manually via API:
```powershell
$cloudData = Get-Content -Path shelly-cloud-data.json -Raw
Invoke-RestMethod -Uri http://localhost:3000/api/metadata/import-cloud -Method POST -ContentType "application/json" -Body $cloudData
```

After import, refresh your frontend to see room names displayed on each device card!

📖 **See [IMPORT_CLOUD_METADATA.md](IMPORT_CLOUD_METADATA.md) for detailed instructions.**

### 4. Device Status Updates

Devices are automatically polled every 60 seconds. The frontend receives real-time updates via WebSocket.

## Your Shelly Devices

Based on your network, you have **24 Shelly devices** that can be automatically discovered using the **"Discover & Add Devices"** button in the frontend!

If you prefer to add devices manually via command line, here are some examples:

```bash
# Ultra (Gen3) - Online devices
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.185","name":"shelly-flur","type":"shelly_ultra"}'
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.186","name":"shelly-dusche","type":"shelly_ultra"}'
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.187","name":"shelly-dusche-2","type":"shelly_ultra"}'

# Plus Plug S (Gen2) - Online devices  
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.171","name":"shelly-bett","type":"shelly_plug_s_plus"}'
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.173","name":"shelly-schreibtisch","type":"shelly_plug_s_plus"}'
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.175","name":"shelly-kueche","type":"shelly_plug_s_plus"}'
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.176","name":"shelly-spulmaschine","type":"shelly_plug_s_plus"}'
curl -X POST http://localhost:3000/api/devices -H "Content-Type: application/json" -d '{"ip":"192.168.0.177","name":"shelly-wz","type":"shelly_plug_s_plus"}'
```

## Troubleshooting

### No devices showing up after scan
- Check MongoDB is running: `mongod` or `docker ps` (if using Docker)
- Check backend logs for errors
- Try manual addition with known IPs
- Make sure devices are on the same network (192.168.0.x)
- Some devices may be offline - check their power status

### Frontend shows "Loading..."
- Open browser DevTools (F12) and check Console for errors
- Verify backend is running at http://localhost:3000/api
- Check Network tab to see if API calls are succeeding
- Try refreshing the page

### Devices not updating
- Check MongoDB connection in backend logs
- Verify devices are reachable: `ping 192.168.0.185`
- Check polling service is running (logs every 60 seconds)
- Devices may be in offline status if they failed to respond 3+ times

## Common API Endpoints

```bash
# List all devices
GET http://localhost:3000/api/devices

# Get specific device
GET http://localhost:3000/api/devices/:id

# Control device (turn on/off)
POST http://localhost:3000/api/devices/:id/control
{
  "action": "on",      // "on" | "off" | "toggle"
  "channel": 0         // optional, default 0
}

# Get device history
GET http://localhost:3000/api/devices/:id/history

# Delete device
DELETE http://localhost:3000/api/devices/:id

# Discover devices
POST http://localhost:3000/api/discovery/scan                  # mDNS (discovery only)
POST http://localhost:3000/api/discovery/scan-subnet           # Subnet scan (discovery only)
POST http://localhost:3000/api/discovery/scan-and-save         # mDNS + auto-save to DB
POST http://localhost:3000/api/discovery/scan-subnet-and-save  # Subnet scan + auto-save to DB
```

## Next Steps

1. ✅ Discover or add your devices
2. ⚠️ Test device control (turn lights on/off)
3. ⏳ Wait for polling cycle to see real-time updates
4. 📊 View device history and power consumption
5. 🎨 Customize device names and organize by rooms (future feature)

## Debug Logging

The backend now has comprehensive debug logging. Watch the terminal output to see:
- 🔍 Device discovery progress
- ⏱️ Polling cycles
- 📊 Device status updates
- 🔌 WebSocket connections
- ✅ Successful operations
- ❌ Errors with details

Set log level to DEBUG for even more details:
```bash
# In backend/.env
LOG_LEVEL=debug
```
