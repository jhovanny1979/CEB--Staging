@echo off
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: Auto-elevate if not running as admin
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Solicitando permisos de Administrador...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

echo Limpiando caches bloqueadas...

for %%D in (
  "%ROOT%\pytest-cache-files-od8ero87"
  "%ROOT%\pytest-cache-files-v80hycrw"
  "%ROOT%\pytest-cache-files-y9xi_eom"
) do (
  if exist "%%~D" (
    echo Procesando %%~D
    takeown /F "%%~D" /R /D S >nul 2>&1
    if errorlevel 1 takeown /F "%%~D" /R /D Y >nul 2>&1
    icacls "%%~D" /grant Administradores:F /T /C >nul 2>&1
    icacls "%%~D" /grant "%USERNAME%":F /T /C >nul 2>&1
    rmdir /S /Q "%%~D" >nul 2>&1
  )
)

echo.
echo Estado final:
dir /AD /B "%ROOT%\pytest-cache-files-*" 2>nul
if errorlevel 1 (
  echo (sin carpetas cache bloqueadas)
)
echo.
echo Limpieza finalizada.
pause
endlocal
exit /b 0
