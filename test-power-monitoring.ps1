# Test Power Monitoring API

Write-Host "Power Monitoring Test Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test 1: Query all devices for power data
Write-Host "[1] Querying power for all devices..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/power/query-all" -Method Post -ContentType "application/json"
    if ($response.success) {
        Write-Host "Success! Queried $($response.results.Count) devices" -ForegroundColor Green
        $successful = ($response.results | Where-Object { $_.success }).Count
        Write-Host "  - Successful: $successful" -ForegroundColor Green
        Write-Host "  - Failed: $($response.results.Count - $successful)" -ForegroundColor $(if ($successful -eq $response.results.Count) { "Green" } else { "Yellow" })
    } else {
        Write-Host "Failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Get latest measurements
Write-Host "[2] Getting latest power measurements..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/power/latest" -Method Get
    if ($response.success) {
        Write-Host "Success! Found $($response.count) measurements" -ForegroundColor Green
        
        # Show first 5 measurements
        $response.measurements | Select-Object -First 5 | ForEach-Object {
            Write-Host "  - $($_.deviceName): $($_.power)W @ $($_.voltage)V" -ForegroundColor Cyan
        }
        
        if ($response.count -gt 5) {
            Write-Host "  ... and $($response.count - 5) more" -ForegroundColor Gray
        }
    } else {
        Write-Host "Failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Get all devices and query first one individually
Write-Host "[3] Testing individual device query..." -ForegroundColor Yellow
try {
    $devices = Invoke-RestMethod -Uri "$baseUrl/api/devices" -Method Get
    if ($devices.Count -gt 0) {
        $deviceId = $devices[0]._id
        $deviceName = $devices[0].name
        
        Write-Host "  Querying device: $deviceName ($deviceId)" -ForegroundColor Cyan
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/power/query/$deviceId" -Method Post
        if ($response.success) {
            Write-Host "  Success!" -ForegroundColor Green
            Write-Host "    Power: $($response.data.power)W" -ForegroundColor Cyan
            Write-Host "    Voltage: $($response.data.voltage)V" -ForegroundColor Cyan
            Write-Host "    Current: $($response.data.current)A" -ForegroundColor Cyan
            Write-Host "    Energy Total: $($response.data.energyTotal)Wh" -ForegroundColor Cyan
        } else {
            Write-Host "  Failed: $($response.error)" -ForegroundColor Red
        }
    } else {
        Write-Host "  No devices found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Get measurements for a device
Write-Host "[4] Getting measurement history..." -ForegroundColor Yellow
try {
    $devices = Invoke-RestMethod -Uri "$baseUrl/api/devices" -Method Get
    if ($devices.Count -gt 0) {
        $deviceId = $devices[0]._id
        $deviceName = $devices[0].name
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/power/measurements/$deviceId`?limit=10" -Method Get
        if ($response.success) {
            Write-Host "  Found $($response.count) measurements for $deviceName" -ForegroundColor Green
            
            if ($response.count -gt 0) {
                Write-Host "  Latest measurements:" -ForegroundColor Cyan
                $response.measurements | Select-Object -First 3 | ForEach-Object {
                    Write-Host "    $($_.timestamp): $($_.power)W" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "  No measurements found yet" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  POST   /api/power/query-all         - Query all devices" -ForegroundColor Gray
Write-Host "  POST   /api/power/query/:deviceId   - Query specific device" -ForegroundColor Gray
Write-Host "  GET    /api/power/latest            - Get latest measurements" -ForegroundColor Gray
Write-Host "  GET    /api/power/measurements/:id  - Get measurement history" -ForegroundColor Gray
Write-Host "  GET    /api/power/statistics/:id    - Get statistics" -ForegroundColor Gray
Write-Host "  POST   /api/power/cleanup           - Clean up old data" -ForegroundColor Gray
Write-Host ""
Write-Host "Scheduled Tasks:" -ForegroundColor Yellow
Write-Host "  - Power polling: Every 5 minutes" -ForegroundColor Gray
Write-Host "  - Data cleanup: Daily at 3 AM (keeps 30 days)" -ForegroundColor Gray
