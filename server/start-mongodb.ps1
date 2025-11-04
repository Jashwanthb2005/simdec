# MongoDB Startup Script
# Run this script as Administrator to start MongoDB

Write-Host "Checking MongoDB service status..." -ForegroundColor Cyan

$service = Get-Service MongoDB -ErrorAction SilentlyContinue

if ($null -eq $service) {
    Write-Host "❌ MongoDB service not found. Please install MongoDB first." -ForegroundColor Red
    Write-Host "Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    exit 1
}

if ($service.Status -eq 'Running') {
    Write-Host "✅ MongoDB is already running!" -ForegroundColor Green
    exit 0
}

Write-Host "Starting MongoDB service..." -ForegroundColor Cyan

try {
    Start-Service MongoDB -ErrorAction Stop
    Start-Sleep -Seconds 2
    $service.Refresh()
    
    if ($service.Status -eq 'Running') {
        Write-Host "✅ MongoDB started successfully!" -ForegroundColor Green
        Write-Host "You can now restart your Node.js server." -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  MongoDB service may still be starting. Wait a few seconds and check again." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start MongoDB: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solution: Run PowerShell as Administrator" -ForegroundColor Yellow
    Write-Host "   1. Right-click PowerShell"
    Write-Host "   2. Select 'Run as Administrator'"
    Write-Host "   3. Run: Start-Service MongoDB" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use Command Prompt (as Admin):" -ForegroundColor Yellow
    Write-Host "   net start MongoDB" -ForegroundColor White
}

