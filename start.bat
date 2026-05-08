@echo off
echo ============================================
echo   myAwesomeApp - Local Development Start
echo ============================================
echo.

echo Starting Auth Service on port 3001...
start "Auth Service" cmd /k "cd /d %~dp0services\auth && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend on port 3000...
start "Frontend" cmd /k "cd /d %~dp0services\frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Health Monitor...
start "Health Monitor" cmd /k "cd /d %~dp0scripts && set AUTH_HEALTH_URL=http://localhost:3001/health && set LIVEOPS_EVENTS_URL=http://localhost:4000/api/events && npx tsx health-monitor.ts"

echo.
echo ============================================
echo   All services starting!
echo.
echo   Auth Service:    http://localhost:3001
echo   Frontend:        http://localhost:3000
echo   Health Monitor:  polling :3001/health
echo.
echo   Open http://localhost:3000 in your browser
echo.
echo   Close the terminal windows to stop
echo ============================================
pause