Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  myAwesomeApp - Local Development Start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Keycloak on port 8080..." -ForegroundColor Green
docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "${rootDir}\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:26.0 start-dev --import-realm

Write-Host "Waiting for Keycloak to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Installing dependencies..." -ForegroundColor Yellow

Push-Location "$rootDir\services\frontend"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  frontend: dependencies OK" }
Pop-Location

Push-Location "$rootDir\scripts"
if (-not (Test-Path "node_modules")) { npm install } else { Write-Host "  health-monitor: dependencies OK" }
Pop-Location

Write-Host ""
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\services\frontend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host "Starting Health Monitor..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$rootDir\scripts`" && set AUTH_HEALTH_URL=http://localhost:8080/health/ready && set LIVEOPS_EVENTS_URL=http://localhost:4000/api/events && npx tsx health-monitor.ts" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host ""
Write-Host "  Keycloak:        http://localhost:8080" -ForegroundColor White
Write-Host "  Keycloak Admin:  http://localhost:8080/admin (admin/admin)" -ForegroundColor White
Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "  Health Monitor:  polling Keycloak health" -ForegroundColor White
Write-Host ""
Write-Host "  Demo credentials: demo / demo" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Open http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Run stop.bat to stop all services" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan