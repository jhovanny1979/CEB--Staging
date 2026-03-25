@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "IS_ADMIN=0"
set "ELEVATION_TRIED=0"
set "PREFERRED_IF=Wi-Fi"
set "TARGET_SSID=%~1"

if "%TARGET_SSID%"=="" (
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$profiles = (netsh wlan show profiles) | Out-String; $match = [regex]::Matches($profiles,'Perfil de todos los usuarios\\s*:\\s*(.+)') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ -match 'RAMIREZ_5G$' } | Select-Object -First 1; if($match){ Write-Output $match }"`) do set "TARGET_SSID=%%i"
)

if /I "%~1"=="_elevated" (
  set "ELEVATION_TRIED=1"
  set "TARGET_SSID=%~2"
  goto :check_admin
)

net session >nul 2>&1
if errorlevel 1 (
  echo [INFO] Solicitando permisos de Administrador...
  if "%TARGET_SSID%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '_elevated' -Verb RunAs" >nul 2>&1
  ) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '_elevated','%TARGET_SSID%' -Verb RunAs" >nul 2>&1
  )
  if errorlevel 1 (
    echo [WARN] No se pudo elevar permisos automaticamente.
    goto :run_without_admin
  )
  exit /b 0
)

set "IS_ADMIN=1"
goto :run

:check_admin
net session >nul 2>&1
if errorlevel 1 (
  if "%ELEVATION_TRIED%"=="1" (
    echo [WARN] No se pudieron obtener permisos de Administrador.
  )
  goto :run_without_admin
)

set "IS_ADMIN=1"
goto :run

:run_without_admin
echo [ERROR] Debes ejecutar este BAT como Administrador para modo movil.
echo [ERROR] Sin permisos admin Windows puede bloquear el acceso desde el celular.
echo [ERROR] Cierra esta ventana, clic derecho en START_CEB_MOVIL.bat y elige "Ejecutar como administrador".
pause
exit /b 1

:run
if not "%TARGET_SSID%"=="" (
  echo [INFO] Forzando conexion Wi-Fi al perfil: %TARGET_SSID%
  netsh wlan connect name="%TARGET_SSID%" >nul 2>&1
  timeout /t 4 >nul
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$line = netsh wlan show interfaces | Select-String -Pattern '^\s*SSID\s*:\s*(.+)$' | Select-Object -First 1; if($line){ ($line.Matches[0].Groups[1].Value).Trim() }"`) do set "CURRENT_SSID=%%i"
if not "%CURRENT_SSID%"=="" echo [INFO] SSID conectado: %CURRENT_SSID%

if "%IS_ADMIN%"=="1" (
  echo [INFO] Habilitando acceso local para movil - puertos 5500 y 8000...
  powershell -NoProfile -Command "Get-NetConnectionProfile | Where-Object { $_.InterfaceAlias -eq '%PREFERRED_IF%' -and $_.NetworkCategory -ne 'Private' } | ForEach-Object { Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private -ErrorAction SilentlyContinue }" >nul 2>&1
  netsh advfirewall firewall delete rule name="CEB Frontend 5500" >nul 2>&1
  netsh advfirewall firewall delete rule name="CEB Backend 8000" >nul 2>&1
  netsh advfirewall firewall add rule name="CEB Frontend 5500" dir=in action=allow protocol=TCP localport=5500 profile=any >nul 2>&1
  netsh advfirewall firewall add rule name="CEB Backend 8000" dir=in action=allow protocol=TCP localport=8000 profile=any >nul 2>&1
  echo [OK] Reglas de firewall aplicadas.
) else (
  echo [INFO] Se omite configuracion de firewall por falta de permisos admin.
)

set "CAP_CONFIG=%ROOT%\mobile-apk\capacitor.config.json"
set "UPDATE_PS1=%ROOT%\mobile-apk\scripts\update-capacitor-config.ps1"
if exist "%CAP_CONFIG%" if exist "%UPDATE_PS1%" (
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%UPDATE_PS1%" -ConfigPath "%CAP_CONFIG%" -PreferredInterfaceAlias "%PREFERRED_IF%"`) do set "APK_IP=%%i"
  if not "%APK_IP%"=="" (
    echo [INFO] Configuracion APK actualizada para IP: %APK_IP%
  )
)

echo [INFO] Iniciando CEB en modo movil...
call "%ROOT%\\START_CEB.bat" sqlite 0.0.0.0 %FRONT_PORT% %BACK_PORT%
if errorlevel 1 exit /b 1

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$ifAlias='%PREFERRED_IF%'; $all = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' }; $private = $all | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }; $ip = ($private | Where-Object { $_.InterfaceAlias -eq $ifAlias } | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress); if(-not $ip){ $routeIf = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1).InterfaceIndex; if($routeIf){ $ip = ($private | Where-Object { $_.InterfaceIndex -eq $routeIf } | Select-Object -First 1 -ExpandProperty IPAddress) } }; if(-not $ip){ $ip = ($private | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip='127.0.0.1' }; Write-Output $ip"`) do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

echo.
echo [OK] Prueba en celular:
echo      http://%LAN_IP%:5500/index.html?app=1
echo.
echo [TIP] Backend movil:
echo      http://%LAN_IP%:8000/health/live
echo.
echo [INFO] Validando acceso local por IP LAN detectada...
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 'http://%LAN_IP%:5500/index.html?app=1'; if($r.StatusCode -eq 200){ Write-Host '[OK] Frontend LAN responde en http://%LAN_IP%:5500/index.html?app=1' } else { Write-Host '[WARN] Frontend LAN respondio con codigo inesperado' } } catch { Write-Host ('[ERROR] Frontend LAN no responde: ' + $_.Exception.Message) }"
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 'http://%LAN_IP%:8000/health/live'; if($r.StatusCode -eq 200){ Write-Host '[OK] Backend LAN responde en http://%LAN_IP%:8000/health/live' } else { Write-Host '[WARN] Backend LAN respondio con codigo inesperado' } } catch { Write-Host ('[ERROR] Backend LAN no responde: ' + $_.Exception.Message) }"
echo.
if not "%APK_IP%"=="" if /I not "%APK_IP%"=="%LAN_IP%" (
  echo [WARN] La APK esta configurada para IP %APK_IP% pero la IP actual detectada es %LAN_IP%.
)
echo [TIP] Si la APK sigue sin abrir, recompila e instala:
echo      BUILD_APK.bat
echo      INSTALL_APK.bat
echo.
echo [IMPORTANTE] Usa exactamente la IP mostrada arriba.
echo [IMPORTANTE] Si el celular no abre, prueba forzando SSID:
echo      START_CEB_MOVIL.bat "TU_SSID"
echo.

endlocal
exit /b 0

