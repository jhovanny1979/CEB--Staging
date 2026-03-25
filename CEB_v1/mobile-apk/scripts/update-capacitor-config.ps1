param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath,
  [string]$HostOverride = '',
  [string]$PreferredInterfaceAlias = 'Wi-Fi',
  [int]$FrontPort = 5500,
  [int]$BackendPort = 8000
)

$ErrorActionPreference = 'Stop'

$resolvedHost = $null
$candidate = [string]$HostOverride
if ($candidate.Trim() -ne '') {
  $resolvedHost = $candidate.Trim()
}

if (-not $resolvedHost) {
  $allIps = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '169.254*' -and
      $_.IPAddress -ne '127.0.0.1' -and
      $_.AddressState -eq 'Preferred'
    }

  $privateIps = $allIps | Where-Object {
    $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)'
  }

  $preferredPrivate = $privateIps | Where-Object {
    $_.InterfaceAlias -eq $PreferredInterfaceAlias
  } | Sort-Object SkipAsSource, InterfaceMetric

  $defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, InterfaceMetric |
    Select-Object -First 1

  if ($preferredPrivate) {
    $resolvedHost = $preferredPrivate | Select-Object -First 1 -ExpandProperty IPAddress
  }

  if (-not $resolvedHost -and $defaultRoute) {
    $resolvedHost = $privateIps |
      Where-Object { $_.InterfaceIndex -eq $defaultRoute.InterfaceIndex } |
      Select-Object -First 1 -ExpandProperty IPAddress
  }

  if (-not $resolvedHost) {
    $resolvedHost = $privateIps | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress
  }

  if (-not $resolvedHost) {
    $resolvedHost = $allIps | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress
  }
}

if (-not $resolvedHost) {
  $resolvedHost = '127.0.0.1'
}

$json = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
if (-not $json.server) {
  $json | Add-Member -MemberType NoteProperty -Name server -Value (@{})
}

if (-not $json.plugins) {
  $json | Add-Member -MemberType NoteProperty -Name plugins -Value (@{})
}
if (-not $json.plugins.StatusBar) {
  $json.plugins | Add-Member -MemberType NoteProperty -Name StatusBar -Value (@{})
}

$json.plugins.StatusBar.overlaysWebView = $false
$json.plugins.StatusBar.backgroundColor = '#F5F5F5'
$json.plugins.StatusBar.style = 'DARK'

# App launcher mode: keep local webDir as entrypoint and route to selected Wi-Fi host at runtime.
if ($json.server.PSObject.Properties.Name -contains 'url') {
  $json.server.PSObject.Properties.Remove('url')
}
$json.server.cleartext = $true
$json.server.allowNavigation = @($resolvedHost, '127.0.0.1', 'localhost', '*.local')

$json | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8

$mobileDir = Split-Path -Parent $ConfigPath
$hostConfigPath = Join-Path (Join-Path $mobileDir 'www') 'host-config.json'
$hostConfig = [ordered]@{
  host = $resolvedHost
  port = $FrontPort
  backend_port = $BackendPort
  app_path = '/index.html?app=1'
  updated_at = (Get-Date).ToString('s')
}
$hostConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $hostConfigPath -Encoding UTF8

Write-Output $resolvedHost
