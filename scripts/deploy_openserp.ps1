# Deploy OpenSERP local container once Docker is ready
$maxWait = 300  # seconds
$waited = 0
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine")

while ($waited -lt $maxWait) {
    $info = docker info 2&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$(Get-Date)] Docker ready, deploying OpenSERP..." -ForegroundColor Green
        docker rm -f openserp 2&1 | Out-Null
        docker run -d --rm -p 127.0.0.1:7000:7000 --name openserp karust/openserp:latest serve -a 0.0.0.0 -p 7000
        Write-Host "[$(Get-Date)] OpenSERP deployed at http://127.0.0.1:7000" -ForegroundColor Green
        exit 0
    }
    Write-Host "[$(Get-Date)] Waiting for Docker... ($waited/$maxWait)" -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $waited += 5
}

Write-Host "[$(Get-Date)] Docker did not become ready in $maxWait seconds" -ForegroundColor Red
exit 1
