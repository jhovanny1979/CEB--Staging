@echo off
setlocal

set "FRONT_DIR=%~dp0comercioebogota_3\comercioebogota"

if not exist "%FRONT_DIR%\encoding_guard.py" (
  echo [ERROR] No existe encoding_guard.py en %FRONT_DIR%
  pause
  exit /b 1
)

pushd "%FRONT_DIR%"
python .\encoding_guard.py --root . --fix
set "RC=%ERRORLEVEL%"
popd

if not "%RC%"=="0" (
  echo [ERROR] Fallo la reparacion de formato.
  pause
  exit /b %RC%
)

echo [OK] Formato UTF-8 reparado/verificado correctamente.
pause
exit /b 0
