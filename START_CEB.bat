@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=sqlite"
set "BIND_HOST=%~2"
if "%BIND_HOST%"=="" set "BIND_HOST=0.0.0.0"

set "BACKEND_DIR=%ROOT%\backend"
set "FRONT_DIR=%ROOT%\comercioebogota_3\comercioebogota"
set "BACKEND_SCRIPT=%BACKEND_DIR%\start-backend.ps1"
set "FRONT_SCRIPT=%FRONT_DIR%\start-front.ps1"

if not exist "%BACKEND_SCRIPT%" (
  echo [ERROR] No existe: %BACKEND_SCRIPT%
  pause
  exit /b 1
)

if not exist "%FRONT_SCRIPT%" (
  echo [ERROR] No existe: %FRONT_SCRIPT%
  pause
  exit /b 1
)

if /I "%MODE%"=="postgres" (
  powershell -NoProfile -Command "if (Test-NetConnection -ComputerName '127.0.0.1' -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }"
  if errorlevel 1 (
    echo [WARN] PostgreSQL no esta disponible en 127.0.0.1:5432.
    echo [WARN] Se iniciara en modo sqlite para que la app funcione.
    set "MODE=sqlite"
  )
)

echo Iniciando backend (%MODE%) y frontend...
echo [INFO] Limpiando procesos previos en puertos 8000 y 5500...
powershell -NoProfile -Command "$ports=@(8000,5500); foreach($port in $ports){ $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach($procId in $procIds){ if($procId){ Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } } }"
ping 127.0.0.1 -n 2 > nul

start "CEB_BACKEND" powershell -NoExit -ExecutionPolicy Bypass -File "%BACKEND_SCRIPT%" -Mode %MODE% -Port 8000 -BindHost %BIND_HOST%

set "BACKEND_UP=0"
for /l %%i in (1,1,15) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health/live' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 (
    set "BACKEND_UP=1"
    goto :backend_ready
  )
  ping 127.0.0.1 -n 2 > nul
)

:backend_ready
if "%BACKEND_UP%"=="0" (
  echo [ERROR] Backend no responde en http://127.0.0.1:8000
  echo [ERROR] Revisa la ventana CEB_BACKEND y ejecuta STOP_CEB.bat antes de reintentar.
  pause
  exit /b 1
)

start "CEB_FRONTEND" powershell -NoExit -ExecutionPolicy Bypass -File "%FRONT_SCRIPT%" -Port 5500 -BindHost %BIND_HOST%

ping 127.0.0.1 -n 2 > nul
start "" "http://127.0.0.1:5500/index.html" >nul 2>&1

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$all = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' }; $private = $all | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }; $routeIf = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1).InterfaceIndex; $ip = $null; if($routeIf){ $ip = ($private | Where-Object { $_.InterfaceIndex -eq $routeIf } | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($private | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($all | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

echo.
echo Frontend: http://%BIND_HOST%:5500/index.html
echo Backend:  http://%BIND_HOST%:8000
echo Swagger:  http://%BIND_HOST%:8000/docs
echo LAN URL:  http://%LAN_IP%:5500/index.html
echo API LAN:  http://%LAN_IP%:8000/health/live
echo.
echo Para detener todo, ejecuta: STOP_CEB.bat

endlocal
exit /b 0

