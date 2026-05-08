@echo off
echo Stopping all myAwesomeApp services...
taskkill /fi "WINDOWTITLE eq Frontend*" >nul 2>&1
taskkill /fi "WINDOWTITLE eq Health Monitor*" >nul 2>&1
docker stop keycloak >nul 2>&1
docker rm keycloak >nul 2>&1
echo All services stopped.
pause