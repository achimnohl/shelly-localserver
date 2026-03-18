# Migration script to move device names from Device to DeviceMetadata
# Run this once after deploying the code changes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Device Name Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend server is running
Write-Host "Checking if backend server is running..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/devices" -Method GET -UseBasicParsing -TimeoutSec 5
    Write-Host "Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "Backend server is not running!" -ForegroundColor Red
    Write-Host "Please start the backend server first: nx serve backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting migration..." -ForegroundColor Yellow
Write-Host ""

try {
    # Call the migration endpoint
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/metadata/migrate-device-names" -Method POST -ContentType "application/json"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    Write-Host "  Total devices processed: $($response.totalDevices)" -ForegroundColor White
    Write-Host "  Names migrated: $($response.migrated)" -ForegroundColor Green
    Write-Host "  Already in metadata: $($response.skipped)" -ForegroundColor Yellow
    Write-Host "  Errors: $($response.errors)" -ForegroundColor Red
    Write-Host ""
    
    if ($response.errorDetails -and $response.errorDetails.Count -gt 0) {
        Write-Host "Error Details:" -ForegroundColor Red
        foreach ($errorItem in $response.errorDetails) {
            Write-Host "  - Device $($errorItem.deviceId): $($errorItem.error)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
} catch {
    Write-Host ""
    Write-Host "Migration failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host ""
