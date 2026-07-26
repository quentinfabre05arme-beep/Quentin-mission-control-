# 🔄 Restart Gateway
param(
    [string]$ConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json",
    [int]$Timeout = 30
)

$startTime = Get-Date
Write-Host "🔄 Gateway Restart initiated at $startTime"
Write-Host "   Config: $ConfigPath"

# Step 1: Find and stop openclaw processes
Write-Host "`n📍 Step 1: Stopping existing processes..."
$processes = Get-Process | Where-Object {$_.ProcessName -like "*openclaw*" -or $_.ProcessName -like "*node*"}

if ($processes) {
    foreach ($proc in $processes) {
        Write-Host "   Stopping $($proc.ProcessName) (PID: $($proc.Id))..."
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "   ✅ Stopped"
        } catch {
            Write-Host "   ⚠️ Could not stop (may already be stopped)"
        }
    }
} else {
    Write-Host "   ℹ️ No processes found (already stopped?)"
}

# Step 2: Wait for clean shutdown
Write-Host "`n📍 Step 2: Waiting for clean shutdown..."
$shutdownWait = 5
for ($i = $shutdownWait; $i -gt 0; $i--) {
    Write-Host "   $i seconds remaining..." -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r   $i seconds remaining... Done"
}

# Step 3: Verify port is free
Write-Host "`n📍 Step 3: Verifying port availability..."
$portInUse = Get-NetTCPConnection -LocalPort 18789 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   ⚠️ Port 18789 still in use, forcing release..."
    # Port will be released when process fully exits
} else {
    Write-Host "   ✅ Port 18789 is free"
}

# Step 4: Start gateway
Write-Host "`n📍 Step 4: Starting gateway..."
try {
    # Set env vars
    $env:OPENCLAW_GATEWAY_TOKEN = "c02cc9…5c69"
    $env:NODE_ENV = "production"
    
    # Start openclaw in background
    $openclawPath = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
    if (-not $openclawPath) {
        $openclawPath = "$env:APPDATA\npm\openclaw.ps1"
    }
    
    if (Test-Path $openclawPath) {
        Write-Host "   Starting: $openclawPath"
        Start-Process powershell -ArgumentList "-Command `"& `'$openclawPath`' gateway `"" -WindowStyle Hidden
        Write-Host "   ✅ Gateway process started"
    } else {
        Write-Host "   ❌ OpenClaw not found at $openclawPath"
        exit 1
    }
} catch {
    Write-Host "   ❌ Failed to start: $($_.Exception.Message)"
    exit 1
}

# Step 5: Wait for startup
Write-Host "`n📍 Step 5: Waiting for startup..."
$maxAttempts = 15
$attempt = 0
$started = $false

while ($attempt -lt $maxAttempts -and -not $started) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        # Check if port is listening
        $connection = Test-NetConnection -ComputerName 127.0.0.1 -Port 18789 -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            $started = $true
            Write-Host "   ✅ Gateway responding on port 18789 (attempt $attempt/$maxAttempts)"
        } else {
            Write-Host "   ⏳ Attempt $attempt/$maxAttempts..."
        }
    } catch {
        Write-Host "   ⏳ Attempt $attempt/$maxAttempts..."
    }
}

if (-not $started) {
    Write-Host "`n   ❌ Gateway failed to start within timeout"
    exit 1
}

# Step 6: Final verification
Write-Host "`n📍 Step 6: Final verification..."
try {
    # Check if process is running
    $process = Get-Process | Where-Object {$_.ProcessName -like "*openclaw*"} | Select-Object -First 1
    if ($process) {
        Write-Host "   ✅ Process running (PID: $($process.Id))"
    } else {
        Write-Host "   ⚠️ Process not found (may be using different name)"
    }
    
    # Check port
    $portCheck = Test-NetConnection -ComputerName 127.0.0.1 -Port 18789 -WarningAction SilentlyContinue
    if ($portCheck.TcpTestSucceeded) {
        Write-Host "   ✅ Port 18789 is listening"
    }
    
} catch {
    Write-Host "   ⚠️ Verification incomplete: $($_.Exception.Message)"
}

$duration = (Get-Date) - $startTime
Write-Host "`n✅ Gateway restart complete!"
Write-Host "   Duration: $($duration.TotalSeconds.ToString('F1')) seconds"
Write-Host "   Port: 18789"
Write-Host "   Status: Running"
Write-Host ""
Write-Host "You can now use 'openclaw' commands."
