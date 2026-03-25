@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=sqlite"
set "BIND_HOST=%~2"
if "%BIND_HOST%"=="" set "BIND_HOST=0.0.0.0"
set "FRONT_PORT=%~3"
set "BACK_PORT=%~4"

set "BACKEND_DIR=%ROOT%\backend"
set "FRONT_DIR=%ROOT%\comercioebogota_3\comercioebogota"
set "BACKEND_SCRIPT=%BACKEND_DIR%\start-backend.ps1"
set "FRONT_SCRIPT=%FRONT_DIR%\start-front.ps1"
set "RUNTIME_DIR=%ROOT%\.runtime"
set "RUNTIME_ENV=%RUNTIME_DIR%\ceb-runtime.env"

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

if "%FRONT_PORT%"=="" (
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$p = 5500..5510 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1; if($p){$p}else{'5500'}"`) do set "FRONT_PORT=%%i"
)
if "%BACK_PORT%"=="" (
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$p = 8000..8010 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1; if($p){$p}else{'8000'}"`) do set "BACK_PORT=%%i"
)

if "%FRONT_PORT%"=="" set "FRONT_PORT=5500"
if "%BACK_PORT%"=="" set "BACK_PORT=8000"

if /I "%MODE%"=="postgres" (
  powershell -NoProfile -Command "if (Test-NetConnection -ComputerName '127.0.0.1' -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }"
  if errorlevel 1 (
    echo [WARN] PostgreSQL no esta disponible en 127.0.0.1:5432.
    echo [WARN] Se iniciara en modo sqlite para que la app funcione.
    set "MODE=sqlite"
  )
)

echo Iniciando backend (%MODE%) y frontend...
echo [INFO] Puertos asignados: FRONT=%FRONT_PORT% BACK=%BACK_PORT%
echo [INFO] Cerrando ventanas CEB previas...
taskkill /FI "WINDOWTITLE eq CEB_FRONTEND*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CEB_BACKEND*" /T /F >nul 2>&1
ping 127.0.0.1 -n 2 > nul

start "CEB_BACKEND" powershell -NoExit -ExecutionPolicy Bypass -File "%BACKEND_SCRIPT%" -Mode %MODE% -Port %BACK_PORT% -BindHost %BIND_HOST%

set "BACKEND_UP=0"
for /l %%i in (1,1,25) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:%BACK_PORT%/health/live' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 (
    set "BACKEND_UP=1"
    goto :backend_ready
  )
  ping 127.0.0.1 -n 2 > nul
)

:backend_ready
if "%BACKEND_UP%"=="0" (
  echo [ERROR] Backend no responde en http://127.0.0.1:%BACK_PORT%
  echo [ERROR] Revisa la ventana CEB_BACKEND y ejecuta STOP_CEB.bat antes de reintentar.
  pause
  exit /b 1
)

start "CEB_FRONTEND" powershell -NoExit -ExecutionPolicy Bypass -File "%FRONT_SCRIPT%" -Port %FRONT_PORT% -BindHost %BIND_HOST%

set "FRONT_UP=0"
for /l %%i in (1,1,20) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:%FRONT_PORT%/index.html' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 (
    set "FRONT_UP=1"
    goto :front_ready
  )
  ping 127.0.0.1 -n 2 > nul
)

:front_ready
if "%FRONT_UP%"=="0" (
  echo [ERROR] Frontend no responde en http://127.0.0.1:%FRONT_PORT%/index.html
  echo [ERROR] Revisa la ventana CEB_FRONTEND y ejecuta STOP_CEB.bat antes de reintentar.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$all = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' }; $private = $all | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }; $routeIf = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1).InterfaceIndex; $ip = $null; if($routeIf){ $ip = ($private | Where-Object { $_.InterfaceIndex -eq $routeIf } | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($private | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($all | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%" >nul 2>&1
> "%RUNTIME_ENV%" (
  echo FRONT_PORT=%FRONT_PORT%
  echo BACK_PORT=%BACK_PORT%
  echo BIND_HOST=%BIND_HOST%
  echo LAN_IP=%LAN_IP%
)

set "HOST_CFG=%ROOT%\mobile-apk\www\host-config.json"
if exist "%HOST_CFG%" (
  powershell -NoProfile -Command "$cfg = [ordered]@{ host='%LAN_IP%'; port=%FRONT_PORT%; backend_port=%BACK_PORT%; app_path='/index.html?app=1'; updated_at=(Get-Date).ToString('s') }; $cfg | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 '%HOST_CFG%'" >nul 2>&1
)

start "" "http://127.0.0.1:%FRONT_PORT%/index.html" >nul 2>&1

echo.
echo Frontend local: http://127.0.0.1:%FRONT_PORT%/index.html
echo Backend local:  http://127.0.0.1:%BACK_PORT%
echo Swagger local:  http://127.0.0.1:%BACK_PORT%/docs
echo.
echo Frontend LAN:   http://%LAN_IP%:%FRONT_PORT%/index.html
echo API LAN:        http://%LAN_IP%:%BACK_PORT%/health/live
echo.
echo Runtime:        %RUNTIME_ENV%
echo Para detener todo, ejecuta: STOP_CEB.bat

endlocal
exit /b 0

