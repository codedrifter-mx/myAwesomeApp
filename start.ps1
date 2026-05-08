Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  myAwesomeApp - Local Development Start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing dependencies..." -ForegroundColor Yellow

Push-Location "$rootDir\services\auth"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  auth: dependencies OK" }
Pop-Location

Push-Location "$rootDir\services\frontend"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  frontend: dependencies OK" }
Pop-Location

Push-Location "$rootDir\scripts"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  health-monitor: dependencies OK" }
Pop-Location

Write-Host ""
Write-Host "Starting Auth Service on port 3001..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\services\auth`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Frontend on port 3000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\services\frontend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Health Monitor..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\scripts`" && set AUTH_HEALTH_URL=http://localhost:3001/health && set LIVEOPS_EVENTS_URL=http://localhost:4000/api/events && npx tsx health-monitor.ts" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host ""
Write-Host "  Auth Service:    http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "  Health Monitor:  polling :3001/health" -ForegroundColor White
Write-Host ""
Write-Host "  Open http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Close the terminal windows to stop" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan