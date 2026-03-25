@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "MOBILE_DIR=%ROOT%\mobile-apk"
set "CONFIG_JSON=%MOBILE_DIR%\capacitor.config.json"
set "APK_PATH=%MOBILE_DIR%\android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_COPY=%ROOT%\CEB-mobile-debug.apk"
set "UPDATE_PS1=%MOBILE_DIR%\scripts\update-capacitor-config.ps1"

if not exist "%CONFIG_JSON%" (
  echo [ERROR] No existe %CONFIG_JSON%
  exit /b 1
)
if not exist "%UPDATE_PS1%" (
  echo [ERROR] No existe %UPDATE_PS1%
  exit /b 1
)

echo [INFO] Actualizando capacitor.config.json...
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%UPDATE_PS1%" -ConfigPath "%CONFIG_JSON%"`) do set "LAN_IP=%%i"
if errorlevel 1 (
  echo [ERROR] No se pudo actualizar capacitor.config.json
  exit /b 1
)
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"
echo [INFO] IP local detectada: %LAN_IP%

pushd "%MOBILE_DIR%"
call npx cap sync android
if errorlevel 1 (
  echo [ERROR] Fallo npx cap sync android
  popd
  exit /b 1
)

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=C:\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Android\Sdk"

pushd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo [ERROR] Fallo build del APK
  popd
  popd
  exit /b 1
)
popd
popd

if exist "%APK_PATH%" (
  copy /Y "%APK_PATH%" "%APK_COPY%" >nul
  echo [OK] APK generado:
  echo      %APK_PATH%
  echo [OK] Copia rapida:
  echo      %APK_COPY%
) else (
  echo [ERROR] No se encontro APK en %APK_PATH%
  exit /b 1
)

echo.
echo [TIP] Inicia servidores para movil con:
echo      START_CEB_MOVIL.bat

echo [TIP] La APK abre un lanzador Wi-Fi interno.
echo [TIP] La IP sugerida para conectar sera:
echo      %LAN_IP%

endlocal
exit /b 0
