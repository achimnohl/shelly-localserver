# Re-import Shelly Cloud Metadata to Update Device Names
# This script will re-import the cloud data to update device names

$cloudDataFile = "shelly-cloud-data.json"
$apiUrl = "http://localhost:3000/api/metadata/import-cloud"

Write-Host "Re-importing Shelly Cloud Metadata" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will update device names from your Shelly Cloud data." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $cloudDataFile)) {
    Write-Host "Error: $cloudDataFile not found!" -ForegroundColor Red
    Write-Host "Please make sure the file exists in the current directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $cloudDataFile" -ForegroundColor Green
Write-Host "Sending import request to backend..." -ForegroundColor Cyan
Write-Host ""

try {
    $cloudData = Get-Content -Path $cloudDataFile -Raw
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $cloudData -ErrorAction Stop
    
    Write-Host "Import successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Import Statistics:" -ForegroundColor Cyan
    Write-Host "  - Imported: $($response.stats.imported) devices" -ForegroundColor White
    Write-Host "  - Updated: $($response.stats.updated) devices" -ForegroundColor White
    Write-Host "  - Failed: $($response.stats.failed) devices" -ForegroundColor White
    Write-Host ""
    
    if ($response.stats.failed -gt 0) {
        Write-Host "Some devices failed to import. Check backend logs for details." -ForegroundColor Yellow
    } else {
        Write-Host "All device names and metadata updated successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Refresh your browser at http://localhost:4200" -ForegroundColor White
    Write-Host "  2. Device names should now match your Shelly Cloud names" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "Import failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  - Backend is running at http://localhost:3000" -ForegroundColor Yellow
    Write-Host "  - MongoDB is running and connected" -ForegroundColor Yellow
    Write-Host "  - The JSON data is valid" -ForegroundColor Yellow
    exit 1
}
