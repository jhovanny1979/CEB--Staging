@echo off
setlocal

echo [INFO] Reglas firewall CEB...
netsh advfirewall firewall show rule name="CEB Frontend 5500" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Falta regla: CEB Frontend 5500
) else (
  echo [OK] Regla presente: CEB Frontend 5500
)
netsh advfirewall firewall show rule name="CEB Backend 8000" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Falta regla: CEB Backend 8000
) else (
  echo [OK] Regla presente: CEB Backend 8000
)
echo.

echo [INFO] Estado de puertos 5500/8000...
powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(5500,8000) } | Select-Object LocalAddress,LocalPort,OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize"

echo.
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$all = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' }; $private = $all | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }; $routeIf = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1).InterfaceIndex; $ip = $null; if($routeIf){ $ip = ($private | Where-Object { $_.InterfaceIndex -eq $routeIf } | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($private | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){ $ip = ($all | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress) }; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

echo [INFO] Verificando frontend en red local...
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://%LAN_IP%:5500/index.html'; Write-Host ('[OK] Frontend: ' + $r.StatusCode) } catch { Write-Host ('[ERROR] Frontend: ' + $_.Exception.Message) }"

echo [INFO] Verificando backend en red local...
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://%LAN_IP%:8000/health/live'; Write-Host ('[OK] Backend: ' + $r.Content) } catch { Write-Host ('[ERROR] Backend: ' + $_.Exception.Message) }"

echo.
echo URL para probar en PC y celular:
echo   http://%LAN_IP%:5500/index.html?app=1

endlocal
exit /b 0
