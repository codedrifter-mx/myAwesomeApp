@echo off
echo Stopping all myAwesomeApp services...
taskkill /fi "WINDOWTITLE eq Auth Service*" >nul 2>&1
taskkill /fi "WINDOWTITLE eq Frontend*" >nul 2>&1
taskkill /fi "WINDOWTITLE eq Health Monitor*" >nul 2>&1
taskkill /fi "WINDOWTITLE eq myAwesomeApp*" >nul 2>&1
echo All services stopped.
pause