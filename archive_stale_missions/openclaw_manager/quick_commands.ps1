# OpenClaw Quick Commands
# Usage: .\quick_commands.ps1 {status|start|stop|restart|recover}

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "start", "stop", "restart", "recover")]
    [string]$Command
)

$BASE_DIR = "C:\Users\quent\.openclaw"
$LOG_FILE = "$BASE_DIR\workspace\memory\openclaw_manager.log"

function Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $message" | Tee-Object -FilePath $LOG_FILE -Append
}

function Get-OpenClawStatus {
    $nodeProcs = Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
        $_.Path -like "*openclaw*" 
    }
    
    if ($nodeProcs) {
        return @{
            Running = $true
            PIDs = $nodeProcs | Select-Object -ExpandProperty Id
            Count = $nodeProcs.Count
        }
    }
    return @{ Running = $false }
}

function Start-OpenClaw {
    Log "Starting OpenClaw..."
    
    $status = Get-OpenClawStatus
    if ($status.Running) {
        Log "Already running with PIDs: $($status.PIDs -join ', ')"
        return
    }
    
    # Start gateway
    $proc = Start-Process -FilePath "$BASE_DIR\gateway.cmd" -WorkingDirectory $BASE_DIR -PassThru
    Log "Started process ID: $($proc.Id)"
    
    # Wait and verify
    Start-Sleep -Seconds 5
    $newStatus = Get-OpenClawStatus
    if ($newStatus.Running) {
        Log "OpenClaw started successfully"
    } else {
        Log "Failed to start OpenClaw"
    }
}

function Stop-OpenClaw {
    Log "Stopping OpenClaw..."
    
    # Try graceful first
    try {
        $result = Start-Process "openclaw" -ArgumentList "gateway","stop" -Wait -PassThru -WindowStyle Hidden
        Log "Graceful stop attempted"
    } catch {
        Log "Graceful stop failed: $($_.Exception.Message)"
    }
    
    # Force kill remaining
    Start-Sleep -Seconds 3
    Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
        $_.Path -like "*openclaw*" 
    } | ForEach-Object {
        Log "Force killing PID: $($_.Id)"
        Stop-Process -Id $_.Id -Force
    }
    
    Log "OpenClaw stopped"
}

function Restart-OpenClaw {
    Log "Restarting OpenClaw..."
    Stop-OpenClaw
    Start-Sleep -Seconds 5
    Start-OpenClaw
}

function Recover-OpenClaw {
    Log "Running auto-recovery..."
    
    $status = Get-OpenClawStatus
    if (-not $status.Running) {
        Log "Not running, starting..."
        Start-OpenClaw
        return
    }
    
    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:18789/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Log "OpenClaw is healthy"
            return
        }
    } catch {
        Log "Health check failed: $($_.Exception.Message)"
    }
    
    Log "Unhealthy, restarting..."
    Restart-OpenClaw
}

# Execute command
switch ($Command) {
    "status" {
        $status = Get-OpenClawStatus
        if ($status.Running) {
            Write-Host "✅ OpenClaw is RUNNING" -ForegroundColor Green
            Write-Host "   PIDs: $($status.PIDs -join ', ')"
            Write-Host "   Processes: $($status.Count)"
        } else {
            Write-Host "❌ OpenClaw is NOT RUNNING" -ForegroundColor Red
        }
    }
    "start" { Start-OpenClaw }
    "stop" { Stop-OpenClaw }
    "restart" { Restart-OpenClaw }
    "recover" { Recover-OpenClaw }
}
