# Backend Comercio e-Bogota

Backend local (FastAPI + PostgreSQL) para gestionar registro, panel cliente, promociones,
suscripciones, recaudos y administracion.

## Opcion A: PostgreSQL (objetivo del plan)

1. Abrir PowerShell **como Administrador**.
2. Ejecutar: `powershell -ExecutionPolicy Bypass -File .\scripts\install-postgres.ps1`
3. Crear bases:
   - `createdb -U postgres ceb_dev`
   - `createdb -U postgres ceb_test`
4. Bootstrap backend:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1`

## Opcion B: SQLite (fallback para iterar ya)

- `powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-sqlite.ps1`

## Ejecutar API

Opcion recomendada (desde `C:\Proyectos Codex\CEB`):

- `START_CEB.bat`

Manual (PowerShell, con rutas entre comillas por el espacio en `Proyectos Codex`):

- `Set-Location -LiteralPath "C:\Proyectos Codex\CEB\backend"`
- `$env:PYTHONPATH='C:\Proyectos Codex\CEB\backend\vendor_lib;C:\Proyectos Codex\CEB\backend'`
- `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

## Pruebas

- `Set-Location -LiteralPath "C:\Proyectos Codex\CEB\backend"`
- `$env:PYTHONPATH='C:\Proyectos Codex\CEB\backend\vendor_lib;C:\Proyectos Codex\CEB\backend'`
- `python -m pytest .\tests\test_auth.py .\tests\test_business_promotions.py .\tests\test_subscription_admin.py -q -p no:cacheprovider`

## API base

- `http://127.0.0.1:8000/api/v1`
- `http://127.0.0.1:8000/docs`

## Arranque Rapido (front + back)

Desde `C:\Proyectos Codex\CEB`:

- `powershell -ExecutionPolicy Bypass -File .\start-all.ps1 -BackendMode postgres -OpenBrowser`

Opciones:

- `-BackendMode postgres|sqlite`
- `-BackendPort 8000`
- `-FrontPort 5500`

Script backend solo:

- `powershell -ExecutionPolicy Bypass -File .\backend\start-backend.ps1 -Mode postgres`

## Ejecucion con doble clic (.bat)

Desde `C:\Proyectos Codex\CEB`:

- `START_CEB.bat` inicia backend + frontend (modo `sqlite` por defecto, recomendado para local).
- `STOP_CEB.bat` detiene ambos.

Para usar PostgreSQL explicitamente:

- `START_CEB.bat postgres`

Para forzar SQLite:

- `START_CEB.bat sqlite`

## Credenciales admin local

- Usuario: `admin` o `admin@comercioebogota.com`
- Clave: `admin123`
- Endpoint login admin: `POST /api/v1/admin/login`
