@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "DB_FILE=%BACKEND%\dev.sqlite3"
set "SCRIPT=%BACKEND%\scripts\sqlite_http_viewer.py"
set "HOST=127.0.0.1"
set "PORT=8765"

if not exist "%SCRIPT%" (
  echo [ERROR] No existe: %SCRIPT%
  pause
  exit /b 1
)

if not exist "%DB_FILE%" (
  echo [ERROR] No existe la base de datos: %DB_FILE%
  echo Inicia primero la app con START_CEB.bat para crearla.
  pause
  exit /b 1
)

echo Abriendo visor web de SQLite...
echo URL: http://%HOST%:%PORT%/
echo BD:  %DB_FILE%
echo.
echo Para detenerlo: cierra esta ventana o presiona Ctrl+C.
echo.

start "" "http://%HOST%:%PORT%/"

pushd "%BACKEND%"
python ".\scripts\sqlite_http_viewer.py" --db "%DB_FILE%" --host %HOST% --port %PORT%
set "RC=%ERRORLEVEL%"
popd

if not "%RC%"=="0" (
  echo.
  echo [ERROR] No se pudo iniciar el visor web de BD.
  pause
)

endlocal
exit /b %RC%
