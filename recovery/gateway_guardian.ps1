# Claw Gateway Guardian
# Ensures gateway NEVER stops — auto-detect failure, auto-restart
# Run this script every 2 minutes via Task Scheduler

param(
    [switch]$Install,
    [switch]$Check,
    [switch]$Repair
)

$LogDir = "C:\Users\quent\.openclaw\workspace\recovery\logs"
$StateFile = "C:\Users\quent\.openclaw\workspace\recovery\state\gateway_guardian.json"
$MaxUptimeLog = "C:\Users\quent\.openclaw\workspace\recovery\logs\max_uptime.log"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-GuardianLog {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] [GUARDIAN] $Message"
    Add-Content -Path "$LogDir\guardian.log" -Value $entry
    if ($Level -eq "ERROR" -or $Level -eq "WARN") { Write-Host $entry }
}

function Test-GatewayHealth {
    # Check 1: Process exists
    $process = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
        $_.CommandLine -like "*openclaw*" -or $_.Path -like "*openclaw*" 
    }
    $processAlive = ($null -ne $process)
    
    # Check 2: Port is listening
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("localhost", 18789)
        $client.Close()
        $portOpen = $true
    } catch {
        $portOpen = $false
    }
    
    # Check 3: Try to get status via openclaw CLI
    $cliHealthy = $false
    try {
        $status = & openclaw status 2>$null | Select-String -Pattern "running|online" | Select-Object -First 1
        if ($status) { $cliHealthy = $true }
    } catch { $cliHealthy = $false }
    
    return @{
        process = $processAlive
        port = $portOpen
        cli = $cliHealthy
        overall = ($processAlive -and $portOpen)
    }
}

function Restart-Gateway {
    Write-GuardianLog "Attempting gateway restart..." "WARN"
    
    # Kill existing processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    
    # Try to restart
    try {
        Start-Process -FilePath "openclaw" -ArgumentList "gateway start" -WindowStyle Hidden -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 10
        
        $health = Test-GatewayHealth
        if ($health.overall) {
            Write-GuardianLog "Gateway restarted successfully" "INFO"
            return $true
        } else {
            Write-GuardianLog "Gateway restart failed — trying fallback..." "ERROR"
        }
    }
    catch {
        Write-GuardianLog "Restart error: $_" "ERROR"
        return $false
    }
    
    # Fallback: direct node start
    try {
        $openclawPath = Get-Command "openclaw" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
        if ($openclawPath) {
            $nodePath = Join-Path (Split-Path $openclawPath) "node.exe"
            $gatewayScript = Join-Path (Split-Path $openclawPath) "..\lib\gateway.js"
            if (Test-Path $gatewayScript) {
                Start-Process -FilePath $nodePath -ArgumentList $gatewayScript -WindowStyle Hidden
                Start-Sleep -Seconds 15
                
                $health2 = Test-GatewayHealth
                if ($health2.overall) {
                    Write-GuardianLog "Gateway restarted via fallback" "INFO"
                    return $true
                }
            }
        }
    }
    catch {
        Write-GuardianLog "Fallback restart error: $_" "ERROR"
    }
    
    Write-GuardianLog "All restart attempts failed" "ERROR"
    return $false
}

function Update-State {
    param($Health)
    
    $state = @{
        last_check = Get-Date -Format "o"
        process_alive = $Health.process
        port_open = $Health.port
        cli_healthy = $Health.cli
        overall_status = if ($Health.overall) { "HEALTHY" } else { "DOWN" }
        consecutive_failures = 0
    }
    
    # Track consecutive failures
    if (Test-Path $StateFile) {
        try {
            $oldState = Get-Content $StateFile | ConvertFrom-Json
            if (-not $Health.overall) {
                $state.consecutive_failures = ($oldState.consecutive_failures + 1)
            }
        } catch { }
    }
    
    $state | ConvertTo-Json | Set-Content $StateFile
    
    # Track max uptime
    if ($Health.overall -and (Test-Path $StateFile)) {
        $oldState = Get-Content $StateFile | ConvertFrom-Json
        $lastRestart = [datetime]::Parse($oldState.last_check)
        $uptime = (Get-Date) - $lastRestart
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm') — Uptime: $($uptime.ToString('dd\.hh\:mm\:ss'))" | Add-Content $MaxUptimeLog
    }
}

# ═══════════════════════════════════════════════════
# INSTALL MODE
# ═══════════════════════════════════════════════════
if ($Install) {
    Write-Host "Installing Gateway Guardian..."
    
    # Create Task Scheduler job every 2 minutes
    $taskName = "Claw-Gateway-Guardian"
    $scriptPath = $PSCommandPath
    
    # Remove existing
    schtasks /delete /tn $taskName /f 2>$null | Out-Null
    
    # Create new
    $action = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    schtasks /create /tn $taskName /tr $action /sc minute /mo 2 /f 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Gateway Guardian installed — checks every 2 minutes"
        Write-GuardianLog "Guardian installed successfully"
    } else {
        Write-Host "❌ Failed to install Guardian"
    }
    exit 0
}

# ═══════════════════════════════════════════════════
# MAIN CHECK
# ═══════════════════════════════════════════════════

$health = Test-GatewayHealth

if ($Check) {
    Write-Host "═══════════════════════════════════════"
    Write-Host "  GATEWAY GUARDIAN STATUS"
    Write-Host "═══════════════════════════════════════"
    Write-Host "Process:   $(if ($health.process) { '✅ RUNNING' } else { '❌ DOWN' })"
    Write-Host "Port 18789: $(if ($health.port) { '✅ OPEN' } else { '❌ CLOSED' })"
    Write-Host "CLI:       $(if ($health.cli) { '✅ RESPONSIVE' } else { '❌ UNRESPONSIVE' })"
    Write-Host "Overall:   $(if ($health.overall) { '✅ HEALTHY' } else { '❌ FAILED' })"
    Write-Host "Time:      $(Get-Date -Format 'HH:mm:ss')"
    Write-Host "═══════════════════════════════════════"
    exit 0
}

if ($Repair) {
    Restart-Gateway
    exit 0
}

# Default: Health check + auto-repair
Update-State -Health $health

if (-not $health.overall) {
    Write-GuardianLog "Gateway unhealthy — attempting repair" "WARN"
    $repaired = Restart-Gateway
    
    if (-not $repaired) {
        Write-GuardianLog "CRITICAL: Gateway could not be restarted" "ERROR"
        # Could notify user here if messaging is available
    }
} else {
    # Silent success — only log every 10 checks to avoid noise
    $checkCount = if (Test-Path $StateFile) { 
        (Get-Content $StateFile | ConvertFrom-Json).check_count 
    } else { 0 }
    
    if ($checkCount % 10 -eq 0) {
        Write-GuardianLog "Gateway healthy (check #$checkCount)" "INFO"
    }
}