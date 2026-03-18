# Start HomeServer - Diagnostic and Launch Script
# This script checks prerequisites and starts both backend and frontend

Write-Host "Shelly HomeServer - Startup Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "[1/5] Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
    if ($mongoTest.TcpTestSucceeded) {
        Write-Host "  MongoDB is running on port 27017" -ForegroundColor Green
    } else {
        Write-Host "  MongoDB is NOT running!" -ForegroundColor Red
        Write-Host "  Please start MongoDB before continuing." -ForegroundColor Yellow
        Write-Host "  Run: net start MongoDB (or start your MongoDB service)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "  Could not check MongoDB status" -ForegroundColor Yellow
}

Write-Host ""

# Check if backend is already running on port 3000
Write-Host "[2/5] Checking if backend port 3000 is available..." -ForegroundColor Yellow
$backendPort = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($backendPort.TcpTestSucceeded) {
    Write-Host "  Port 3000 is already in use" -ForegroundColor Yellow
    Write-Host "  If this is the backend, you're good!" -ForegroundColor Green
    Write-Host "  Otherwise, kill the process using port 3000" -ForegroundColor Yellow
} else {
    Write-Host "  Port 3000 is available" -ForegroundColor Green
}

Write-Host ""

# Check if frontend is already running on port 4200
Write-Host "[3/5] Checking if frontend port 4200 is available..." -ForegroundColor Yellow
$frontendPort = Test-NetConnection -ComputerName localhost -Port 4200 -WarningAction SilentlyContinue
if ($frontendPort.TcpTestSucceeded) {
    Write-Host "  Port 4200 is already in use" -ForegroundColor Yellow
    Write-Host "  If this is the frontend, you're good!" -ForegroundColor Green
    Write-Host "  Otherwise, kill the process using port 4200" -ForegroundColor Yellow
} else {
    Write-Host "  Port 4200 is available" -ForegroundColor Green
}

Write-Host ""

# Check node_modules
Write-Host "[4/5] Checking node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  node_modules NOT found!" -ForegroundColor Red
    Write-Host "  Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  npm install completed" -ForegroundColor Green
}

Write-Host ""

# Check proxy configuration
Write-Host "[5/5] Checking proxy configuration..." -ForegroundColor Yellow
if (Test-Path "frontend/proxy.conf.json") {
    Write-Host "  Proxy configuration exists" -ForegroundColor Green
    $proxyConfig = Get-Content "frontend/proxy.conf.json" | ConvertFrom-Json
    Write-Host "  API proxy target: $($proxyConfig.'/api'.target)" -ForegroundColor Cyan
} else {
    Write-Host "  Proxy configuration NOT found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Ask user what to start
Write-Host "What would you like to start?" -ForegroundColor Yellow
Write-Host "  1. Backend only (port 3000)" -ForegroundColor White
Write-Host "  2. Frontend only (port 4200)" -ForegroundColor White
Write-Host "  3. Both backend and frontend" -ForegroundColor White
Write-Host "  4. Check status only (exit)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting backend on http://localhost:3000..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        npm run serve:backend
    }
    "2" {
        Write-Host ""
        Write-Host "Starting frontend on http://localhost:4200..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        npm run serve:frontend
    }
    "3" {
        Write-Host ""
        Write-Host "Starting both backend and frontend..." -ForegroundColor Green
        Write-Host ""
        Write-Host "Backend will run on: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Frontend will run on: http://localhost:4200" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop both" -ForegroundColor Yellow
        Write-Host ""
        npm run serve:both
    }
    "4" {
        Write-Host ""
        Write-Host "Status check complete. Exiting." -ForegroundColor Green
        Write-Host ""
        Write-Host "To start manually:" -ForegroundColor Yellow
        Write-Host "  Backend:  npm run serve:backend" -ForegroundColor White
        Write-Host "  Frontend: npm run serve:frontend" -ForegroundColor White
        Write-Host "  Both:     npm run serve:both" -ForegroundColor White
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}
