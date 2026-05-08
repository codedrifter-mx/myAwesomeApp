@echo off
setlocal
where wsl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WSL not found. Please install WSL first.
    pause
    exit /b 1
)

echo Starting Keycloak on port 8080 via WSL...
wsl docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "/mnt/c/Users/Kazuk/projects/myAwesomeApp/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:25.0 start-dev --import-realm

echo Waiting for Keycloak to start (40 seconds)...
timeout /t 40 /nobreak >nul

echo Starting Frontend on port 3000...
start "Frontend" cmd /k "cd /d %~dp0services\frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo Starting Health Monitor...
start "Health Monitor" cmd /k "cd /d %~dp0scripts && set AUTH_HEALTH_URL=http://localhost:8080/health/ready && set LIVEOPS_EVENTS_URL=http://localhost:4000/api/events && npx tsx health-monitor.ts"

echo.
echo ============================================
echo   All services starting!
echo.
echo   Keycloak:        http://localhost:8080
echo   Keycloak Admin:  http://localhost:8080/admin (admin/admin)
echo   Frontend:        http://localhost:3000
echo   Health Monitor:  polling Keycloak health
echo.
echo   Demo credentials: demo / demo
echo.
echo   Open http://localhost:3000 in your browser
echo   Run stop.bat to stop
echo ============================================
pause