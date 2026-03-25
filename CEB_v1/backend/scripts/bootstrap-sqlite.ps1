param(
    [switch]$SkipTests
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

$sqliteDb = Join-Path $root 'dev.sqlite3'
$testDb = Join-Path $root 'test.sqlite3'

$env:DATABASE_URL = "sqlite+pysqlite:///$($sqliteDb -replace '\\','/')"
$env:TEST_DATABASE_URL = "sqlite+pysqlite:///$($testDb -replace '\\','/')"
$env:PYTHONPATH = "$vendor;$root"
$env:SECRET_KEY = 'DEV_SECRET_SQLITE'

python -m alembic upgrade head
python .\scripts\seed_data.py

if (-not $SkipTests) {
    python -m pytest .\tests\test_auth.py .\tests\test_business_promotions.py .\tests\test_subscription_admin.py -q -p no:cacheprovider
}

Write-Host 'SQLite dev bootstrap done.'
Write-Host 'Run API with:'
Write-Host "`$env:PYTHONPATH='$vendor;$root'"
Write-Host "`$env:DATABASE_URL='sqlite+pysqlite:///$($sqliteDb -replace '\\','/')'"
Write-Host "python -m uvicorn app.main:app --reload"
