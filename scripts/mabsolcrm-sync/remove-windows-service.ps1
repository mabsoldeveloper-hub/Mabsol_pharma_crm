param(
  [string]$ServiceName = "MabsolCrmSync"
)

$ErrorActionPreference = "Stop"

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Host "Service $ServiceName is not installed."
  exit 0
}

if ($service.Status -ne "Stopped") {
  Stop-Service -Name $ServiceName
}

sc.exe delete $ServiceName | Out-Host
Write-Host "Removed $ServiceName."
