@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "ADB=C:\Android\Sdk\platform-tools\adb.exe"
if not exist "%ADB%" set "ADB=adb"

echo [INFO] Iniciando backend+frontend para USB (localhost)...
call "%ROOT%\START_CEB.bat" sqlite 127.0.0.1
if errorlevel 1 exit /b 1

echo [INFO] Configurando tunel ADB reverse (5500 y 8000)...
"%ADB%" start-server >nul 2>&1
"%ADB%" devices
"%ADB%" reverse --remove-all >nul 2>&1
"%ADB%" reverse tcp:5500 tcp:5500
if errorlevel 1 (
  echo [ERROR] No se pudo configurar adb reverse para 5500.
  echo [TIP] Conecta el celular por USB y habilita Depuracion USB.
  exit /b 1
)
"%ADB%" reverse tcp:8000 tcp:8000
if errorlevel 1 (
  echo [ERROR] No se pudo configurar adb reverse para 8000.
  echo [TIP] Conecta el celular por USB y habilita Depuracion USB.
  exit /b 1
)

echo.
echo [OK] Listo para modo USB.
echo [OK] En app y navegador del celular usa:
echo      http://127.0.0.1:5500/index.html?app=1
echo.
echo [TIP] Mantener cable USB conectado mientras pruebas.

endlocal
exit /b 0
