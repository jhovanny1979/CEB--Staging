param(
  [int]$Port = 5500,
  [string]$BindHost = '127.0.0.1'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "[UTF8] Verificando codificacion del frontend..." -ForegroundColor Yellow
python .\encoding_guard.py --root $root --check
if ($LASTEXITCODE -ne 0) {
  Write-Host "[UTF8] Se detectaron textos con codificacion mixta. Aplicando reparacion automatica..." -ForegroundColor Yellow
  python .\encoding_guard.py --root $root --fix
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[UTF8] No fue posible reparar automaticamente todos los archivos." -ForegroundColor Red
  } else {
    python .\encoding_guard.py --root $root --check
    if ($LASTEXITCODE -eq 0) {
      Write-Host "[UTF8] Reparacion completada correctamente." -ForegroundColor Green
    } else {
      Write-Host "[UTF8] Persisten alertas de codificacion. Revisa archivos editados externamente." -ForegroundColor Yellow
    }
  }
}

python .\serve_front_utf8.py --host $BindHost --port $Port
