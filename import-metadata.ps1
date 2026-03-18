# Import Shelly Cloud Metadata Script
# Run this script to import your Shelly Cloud metadata into HomeServer

$cloudDataFile = "shelly-cloud-data.json"
$apiUrl = "http://localhost:3000/api/metadata/import-cloud"

Write-Host "Checking if Shelly Cloud data file exists..." -ForegroundColor Cyan

if (-not (Test-Path $cloudDataFile)) {
    Write-Host "Error: $cloudDataFile not found!" -ForegroundColor Red
    Write-Host "Please create the file with your Shelly Cloud JSON data." -ForegroundColor Yellow
    Write-Host "See IMPORT_CLOUD_METADATA.md for instructions." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $cloudDataFile" -ForegroundColor Green
Write-Host "Importing metadata to HomeServer..." -ForegroundColor Cyan

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
        Write-Host "All devices imported successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Refresh your browser at http://localhost:4200" -ForegroundColor White
    Write-Host "  2. You should now see room names on device cards" -ForegroundColor White
    
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
