param(
    [ValidateSet('postgres','sqlite')]
    [string]$Mode = 'postgres',
    [int]$Port = 8000,
    [string]$BindHost = '127.0.0.1',
    [switch]$Reload,
    [switch]$SkipMigrations,
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$vendor = Join-Path $root 'vendor_lib'
if (-not (Test-Path $vendor)) {
    Write-Host "No existe vendor_lib. Ejecuta primero: powershell -ExecutionPolicy Bypass -File .\\scripts\\bootstrap.ps1" -ForegroundColor Yellow
    exit 1
}

if ($Mode -eq 'postgres') {
    if (-not (Test-Path (Join-Path $root '.env'))) {
        if (Test-Path (Join-Path $root '.env.example')) {
            Copy-Item (Join-Path $root '.env.example') (Join-Path $root '.env')
            Write-Host 'Se creo .env desde .env.example. Ajusta DATABASE_URL si hace falta.' -ForegroundColor Yellow
        }
    }
} else {
    $sqliteDb = Join-Path $root 'dev.sqlite3'
    if (-not (Test-Path $sqliteDb)) {
        New-Item -ItemType File -Path $sqliteDb | Out-Null
    }

    $env:DATABASE_URL = "sqlite+pysqlite:///$($sqliteDb -replace '\\','/')"
    $env:TEST_DATABASE_URL = "sqlite+pysqlite:///$((Join-Path $root 'test.sqlite3') -replace '\\','/')"
    if (-not $env:SECRET_KEY) {
        $env:SECRET_KEY = 'DEV_SECRET_SQLITE'
    }
}

$env:PYTHONPATH = "$vendor;$root"

if ($Mode -eq 'postgres') {
    Write-Host 'Validando que PostgreSQL escuche en puerto 5432...' -ForegroundColor Cyan
    $pgOpen = Test-NetConnection -ComputerName '127.0.0.1' -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $pgOpen) {
        Write-Host 'No hay PostgreSQL escuchando en 127.0.0.1:5432. Inicia el servicio o ajusta .env.' -ForegroundColor Red
        Write-Host 'Tip: para iterar rapido usa START_CEB.bat sqlite' -ForegroundColor Yellow
        exit 1
    }
    Write-Host 'Puerto PostgreSQL detectado.' -ForegroundColor Green
}

if (-not $SkipMigrations) {
    Write-Host 'Aplicando migraciones...' -ForegroundColor Cyan
    python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Fallo al aplicar migraciones.' -ForegroundColor Red
        exit 1
    }
}

if (-not $SkipSeed) {
    Write-Host 'Cargando datos base...' -ForegroundColor Cyan
    python .\scripts\seed_data.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Fallo al cargar seed de datos.' -ForegroundColor Red
        exit 1
    }
}

Write-Host "Iniciando backend ($Mode) en http://$($BindHost):$Port" -ForegroundColor Cyan
if ($Reload) {
    python -m uvicorn app.main:app --reload --host $BindHost --port $Port
} else {
    python -m uvicorn app.main:app --host $BindHost --port $Port
}
