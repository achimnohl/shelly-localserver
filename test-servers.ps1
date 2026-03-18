# Test if HomeServer backend and frontend are running

Write-Host "HomeServer Status Check" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Test Backend
Write-Host "Testing Backend (http://localhost:3000)..." -ForegroundColor Yellow
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3000/api/devices" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Backend is RUNNING" -ForegroundColor Green
    Write-Host "  - API responding: YES" -ForegroundColor Green
    Write-Host "  - Devices found: $($backend.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "  Backend is NOT RUNNING or not responding" -ForegroundColor Red
    Write-Host "  - Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  - Solution: Run 'npm run serve:backend'" -ForegroundColor Yellow
}

Write-Host ""

# Test Frontend
Write-Host "Testing Frontend (http://localhost:4200)..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:4200" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Frontend is RUNNING" -ForegroundColor Green
    Write-Host "  - Status: $($frontend.StatusCode) $($frontend.StatusDescription)" -ForegroundColor Green
} catch {
    Write-Host "  Frontend is NOT RUNNING or not responding" -ForegroundColor Red
    Write-Host "  - Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  - Solution: Run 'npm run serve:frontend'" -ForegroundColor Yellow
}

Write-Host ""

# Test Power API
Write-Host "Testing Power API..." -ForegroundColor Yellow
try {
    $power = Invoke-RestMethod -Uri "http://localhost:3000/api/power/latest" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Power API is RESPONDING" -ForegroundColor Green
    Write-Host "  - Success: $($power.success)" -ForegroundColor Green
    Write-Host "  - Measurements: $($power.count)" -ForegroundColor Cyan
} catch {
    Write-Host "  Power API NOT responding" -ForegroundColor Red
    Write-Host "  - Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test MongoDB
Write-Host "Testing MongoDB (port 27017)..." -ForegroundColor Yellow
$mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
if ($mongoTest.TcpTestSucceeded) {
    Write-Host "  MongoDB is RUNNING" -ForegroundColor Green
} else {
    Write-Host "  MongoDB is NOT RUNNING" -ForegroundColor Red
    Write-Host "  - Solution: Start MongoDB service" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "  MongoDB:  mongodb://localhost:27017" -ForegroundColor White
Write-Host ""
Write-Host "If any service is not running, use:" -ForegroundColor Yellow
Write-Host "  .\start-server.ps1" -ForegroundColor Cyan
Write-Host "Or manually:" -ForegroundColor Yellow
Write-Host "  npm run serve:backend   # Terminal 1" -ForegroundColor White
Write-Host "  npm run serve:frontend  # Terminal 2" -ForegroundColor White
