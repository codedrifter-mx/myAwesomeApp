@echo off
echo ============================================
echo   myAwesomeApp - Local Development Start
echo ============================================
echo.

echo Starting Keycloak on port 8080...
docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "%~dp0keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:26.0 start-dev --import-realm

echo Waiting for Keycloak to start (30 seconds)...
timeout /t 30 /nobreak >nul

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
echo.
echo   Close the terminal windows to stop
echo   Run stop.bat to stop Keycloak container
echo ============================================
pause