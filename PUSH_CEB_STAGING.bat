@echo off
setlocal

set "SRC_ROOT=C:\Proyectos Codex\CEB"
set "PUBLISH_ROOT=C:\Proyectos Codex\_PUBLISH_CEB_STAGING"
set "REMOTE_URL=https://github.com/jhovanny1979/CEB--Staging.git"
set "TARGET_BRANCH=main"
set "NO_PAUSE=0"

if /I "%~1"=="--no-pause" (
  set "NO_PAUSE=1"
  shift
)

echo [INFO] Sincronizando CEB -> _PUBLISH_CEB_STAGING\CEB ...
robocopy "%SRC_ROOT%" "%PUBLISH_ROOT%\CEB" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD ".git" ".venv" "node_modules" "__pycache__" ".pytest_cache" "dist" "build" >nul
set "RC1=%ERRORLEVEL%"

echo [INFO] Sincronizando CEB_v1 -> _PUBLISH_CEB_STAGING\CEB_v1 ...
robocopy "%SRC_ROOT%\CEB_v1" "%PUBLISH_ROOT%\CEB_v1" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD ".git" ".venv" "node_modules" "__pycache__" ".pytest_cache" "dist" "build" >nul
set "RC2=%ERRORLEVEL%"

if %RC1% GEQ 8 (
  echo [WARN] Robocopy CEB retorno %RC1% - hubo archivos con error.
)
if %RC2% GEQ 8 (
  echo [WARN] Robocopy CEB_v1 retorno %RC2% - hubo archivos con error.
)

git -C "%PUBLISH_ROOT%" remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [INFO] Configurando remote origin...
  git -C "%PUBLISH_ROOT%" remote add origin "%REMOTE_URL%"
)

git -C "%PUBLISH_ROOT%" fetch origin >nul 2>&1
git -C "%PUBLISH_ROOT%" branch --set-upstream-to=origin/%TARGET_BRANCH% %TARGET_BRANCH% >nul 2>&1

for /f %%A in ('git -C "%PUBLISH_ROOT%" status --porcelain ^| find /c /v ""') do set "CHANGES=%%A"
if "%CHANGES%"=="0" (
  echo [OK] No hay cambios para publicar.
  echo [OK] Repo conectado a %REMOTE_URL% rama %TARGET_BRANCH%.
  goto :end
)

set "MSG=sync CEB and CEB_v1 %date% %time%"

echo [INFO] Commit: %MSG%
git -C "%PUBLISH_ROOT%" add -A
git -C "%PUBLISH_ROOT%" commit -m "%MSG%"
if errorlevel 1 (
  echo [ERROR] No se pudo crear el commit.
  goto :end
)

echo [INFO] Push a origin/%TARGET_BRANCH% ...
git -C "%PUBLISH_ROOT%" push origin %TARGET_BRANCH%
if errorlevel 1 (
  echo [ERROR] Fallo el push.
  goto :end
)

echo [OK] Publicacion completada en %REMOTE_URL% (%TARGET_BRANCH%).

:end
echo.
if "%NO_PAUSE%"=="1" goto :skip_pause
pause
:skip_pause
endlocal
