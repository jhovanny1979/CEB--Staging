@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "APK=%ROOT%\CEB-mobile-debug.apk"
set "ADB=C:\Android\Sdk\platform-tools\adb.exe"

if not exist "%APK%" (
  echo [ERROR] No existe APK: %APK%
  echo Ejecuta primero BUILD_APK.bat
  exit /b 1
)

if not exist "%ADB%" (
  set "ADB=adb"
)

echo [INFO] Dispositivos conectados:
"%ADB%" devices

echo.
echo [INFO] Instalando APK...
"%ADB%" install -r "%APK%"
if errorlevel 1 (
  echo [ERROR] No se pudo instalar el APK.
  echo Revisa que el celular tenga Depuracion USB activa.
  exit /b 1
)

echo [OK] APK instalado correctamente.
endlocal
exit /b 0
