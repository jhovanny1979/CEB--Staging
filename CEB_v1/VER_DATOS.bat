@echo off
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\backend"
if not exist "%BACKEND%\scripts\show_data.py" (
  echo [ERROR] No existe %BACKEND%\scripts\show_data.py
  pause
  exit /b 1
)

set "PYTHONPATH=%BACKEND%\vendor_lib;%BACKEND%"

pushd "%BACKEND%"
python .\scripts\show_data.py
set "RC=%ERRORLEVEL%"
popd

echo.
if not "%RC%"=="0" (
  echo [ERROR] No se pudieron consultar los datos locales.
  echo Tip: inicia primero con START_CEB.bat o valida DATABASE_URL en backend\.env
) else (
  echo Consulta completada.
)

pause
endlocal
exit /b %RC%
