$ErrorActionPreference = 'Stop'

Write-Host 'Installing PostgreSQL via Chocolatey (requires Admin shell)...'
choco install postgresql --yes --params-global --params "'/Password:postgres /Port:5432'"

Write-Host 'PostgreSQL installation command finished.'
Write-Host 'Then run:'
Write-Host '  createdb -U postgres ceb_dev'
Write-Host '  createdb -U postgres ceb_test'
