# SearXNG Docker setup helper for OpenClaw local search
# Run after Docker Desktop is installed and WSL2 is enabled.
$ErrorActionPreference = "Stop"

$repo = Split-Path $PSScriptRoot -Parent
$searxDir = "$repo\searxng-docker"

Write-Host "Setting up SearXNG in $searxDir" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $searxDir | Out-Null
Set-Location $searxDir

# Download official SearXNG Docker Compose template
$composeUrl = "https://raw.githubusercontent.com/searxng/searxng-docker/master/docker-compose.yaml"
$envUrl = "https://raw.githubusercontent.com/searxng/searxng-docker/master/.env"

try {
    Invoke-WebRequest -Uri $composeUrl -OutFile docker-compose.yaml -UseBasicParsing
    Invoke-WebRequest -Uri $envUrl -OutFile .env -UseBasicParsing
    Write-Host "Downloaded SearXNG Docker files" -ForegroundColor Green
} catch {
    Write-Host "Failed to download template: $_" -ForegroundColor Red
    exit 1
}

# Generate secret key for .env
$secret = -join ((1..32) | ForEach-Object { Get-Random -Maximum 16 | ForEach-Object { "0123456789abcdef"[$_] } })
(Get-Content .env) -replace 'SEARXNG_SECRET=.*', "SEARXNG_SECRET=$secret" | Set-Content .env

# Start container
docker compose up -d

Write-Host "SearXNG starting at http://localhost:8080" -ForegroundColor Green
Write-Host "Next: configure settings.yaml to add - JSON under formats, then restart container." -ForegroundColor Yellow
