@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "RUNTIME_ENV=%ROOT%\.runtime\ceb-runtime.env"
set "FRONT_PORT=5500"
set "BACK_PORT=8000"

if exist "%RUNTIME_ENV%" (
  for /f "usebackq tokens=1,2 delims==" %%A in ("%RUNTIME_ENV%") do (
    if /I "%%A"=="FRONT_PORT" set "FRONT_PORT=%%B"
    if /I "%%A"=="BACK_PORT" set "BACK_PORT=%%B"
  )
)

echo Deteniendo frontend y backend de CEB...

taskkill /FI "WINDOWTITLE eq CEB_FRONTEND*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CEB_BACKEND*" /T /F >nul 2>&1

echo.
echo Si quedo algun proceso suelto, cerrando python/uvicorn asociados...
taskkill /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq CEB_*" /T /F >nul 2>&1

echo Limpiando puertos usados por CEB...
powershell -NoProfile -Command "$ports=@(%FRONT_PORT%,%BACK_PORT%) + (5500..5510) + (8000..8010); $ports=$ports | Select-Object -Unique; foreach($port in $ports){ $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach($procId in $procIds){ if($procId){ Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } } }"

echo Listo. Servicios detenidos.

endlocal
exit /b 0
