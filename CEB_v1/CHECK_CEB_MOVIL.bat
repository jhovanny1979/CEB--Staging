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
    if /I "%%A"=="LAN_IP" set "LAN_IP=%%B"
  )
)

echo [INFO] Reglas firewall CEB...
netsh advfirewall firewall show rule name="CEB Frontend %FRONT_PORT%" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Falta regla: CEB Frontend %FRONT_PORT%
) else (
  echo [OK] Regla presente: CEB Frontend %FRONT_PORT%
)
netsh advfirewall firewall show rule name="CEB Backend %BACK_PORT%" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Falta regla: CEB Backend %BACK_PORT%
) else (
  echo [OK] Regla presente: CEB Backend %BACK_PORT%
)
echo.

echo [INFO] Estado de puertos %FRONT_PORT%/%BACK_PORT%...
powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(%FRONT_PORT%,%BACK_PORT%) } | Select-Object LocalAddress,LocalPort,OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize"

echo.
if "%LAN_IP%"=="" for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$all = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' }; $private = $all | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }; $routeIf = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1).InterfaceIndex; $ip = $null; if($routeIf){ $ip = ($private | Where-Object { $_.InterfaceIndex -eq $routeIf } | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($private | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($all | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

echo [INFO] Verificando frontend en red local...
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://%LAN_IP%:%FRONT_PORT%/index.html'; Write-Host ('[OK] Frontend: ' + $r.StatusCode) } catch { Write-Host ('[ERROR] Frontend: ' + $_.Exception.Message) }"

echo [INFO] Verificando backend en red local...
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://%LAN_IP%:%BACK_PORT%/health/live'; Write-Host ('[OK] Backend: ' + $r.Content) } catch { Write-Host ('[ERROR] Backend: ' + $_.Exception.Message) }"

echo.
echo URL para probar en PC y celular:
echo   http://%LAN_IP%:%FRONT_PORT%/index.html?app=1

endlocal
exit /b 0
