param(
    [ValidateSet('postgres','sqlite')]
    [string]$BackendMode = 'sqlite',
    [int]$BackendPort = 8000,
    [int]$FrontPort = 5500,
    [string]$BindHost = '127.0.0.1',
    [switch]$OpenBrowser,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendScript = Join-Path $root 'backend\start-backend.ps1'
$frontScript = Join-Path $root 'comercioebogota_3\comercioebogota\start-front.ps1'

if (-not (Test-Path $backendScript)) {
    Write-Host "No existe: $backendScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontScript)) {
    Write-Host "No existe: $frontScript" -ForegroundColor Red
    exit 1
}

$backendArgs = @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $backendScript, '-Mode', $BackendMode, '-Port', $BackendPort, '-BindHost', $BindHost)
$frontArgs = @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $frontScript, '-Port', $FrontPort, '-BindHost', $BindHost)

if ($DryRun) {
    Write-Host 'Dry run activado. Comandos a ejecutar:' -ForegroundColor Yellow
    Write-Host ('powershell ' + ($backendArgs -join ' '))
    Write-Host ('powershell ' + ($frontArgs -join ' '))
    exit 0
}

Start-Process powershell -ArgumentList $backendArgs | Out-Null
Start-Sleep -Milliseconds 700
Start-Process powershell -ArgumentList $frontArgs | Out-Null

Write-Host "Backend: http://$($BindHost):$BackendPort" -ForegroundColor Green
Write-Host "Frontend: http://$($BindHost):$FrontPort/index.html" -ForegroundColor Green
Write-Host "Swagger: http://$($BindHost):$BackendPort/docs" -ForegroundColor Green

if ($OpenBrowser) {
    Start-Process "http://$($BindHost):$FrontPort/index.html" | Out-Null
}
