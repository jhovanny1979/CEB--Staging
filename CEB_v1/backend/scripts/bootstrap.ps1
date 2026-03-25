param(
    [switch]$SkipMigrations,
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $root

$vendor = Join-Path $root 'vendor_lib'
if (-not (Test-Path $vendor)) {
    New-Item -ItemType Directory -Path $vendor | Out-Null
}

python -m pip install --target "$vendor" -r .\requirements.txt
icacls "$vendor" /grant "BUILTIN\Usuarios:(OI)(CI)RX" /T | Out-Null

if (-not (Test-Path '.env')) {
    Copy-Item .env.example .env
    Write-Host 'Created .env from .env.example'
}

$env:PYTHONPATH = "$vendor;$root"

if (-not $SkipMigrations) {
    python -m alembic upgrade head
}

if (-not $SkipSeed) {
    python .\scripts\seed_data.py
}

Write-Host 'Bootstrap done.'
Write-Host 'Run API:'
Write-Host "$env:PYTHONPATH = '$vendor;$root'"
Write-Host 'python -m uvicorn app.main:app --reload'
