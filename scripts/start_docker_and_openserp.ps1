# Start Docker Desktop and deploy OpenSERP
$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Start Docker Desktop if not running
$proc = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Host "[$(Get-Date)] Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process $dockerExe -WindowStyle Hidden
}

# Wait then deploy OpenSERP
Start-Sleep -Seconds 30
& "C:\Users\quent\.openclaw\workspace\scripts\deploy_openserp.ps1"
