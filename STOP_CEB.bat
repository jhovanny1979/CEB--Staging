@echo off
setlocal

echo Deteniendo frontend y backend de CEB...

taskkill /FI "WINDOWTITLE eq CEB_FRONTEND*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CEB_BACKEND*" /T /F >nul 2>&1

echo.
echo Si quedo algun proceso suelto, cerrando python/uvicorn asociados...
taskkill /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq CEB_*" /T /F >nul 2>&1

echo Limpiando puertos 8000 y 5500...
powershell -NoProfile -Command "$ports=@(8000,5500); foreach($port in $ports){ $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach($procId in $procIds){ if($procId){ Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } } }"

echo Listo. Servicios detenidos.

endlocal
exit /b 0
