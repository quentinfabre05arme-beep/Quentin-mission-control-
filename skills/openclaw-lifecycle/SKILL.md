# OpenClaw Lifecycle Manager

Manage OpenClaw processes: start, stop, restart, status checks, and auto-recovery.

## Usage

When to use this skill:
- OpenClaw needs to restart after config changes
- Gateway is unresponsive
- Need to check if processes are running
- Auto-recovery from failures
- Scheduled maintenance restarts

## Commands

### Status Check
```powershell
# Check if OpenClaw is running
Get-Process | Where-Object { $_.ProcessName -match "node|openclaw" }

# Check gateway port
Test-NetConnection -ComputerName localhost -Port 18789

# Check logs
tail -20 C:\Users\quent\.openclaw\logs\gateway.log
```

### Start OpenClaw
```powershell
# Method 1: Using gateway script
cd C:\Users\quent\.openclaw
.\gateway.cmd

# Method 2: Direct node execution
cd C:\Users\quent\AppData\Roaming\npm\node_modules\openclaw
node dist\index.js gateway --config C:\Users\quent\.openclaw\openclaw.json

# Method 3: Using VBS (silent)
cd C:\Users\quent\.openclaw
wscript .\gateway.vbs
```

### Stop OpenClaw
```powershell
# Graceful shutdown
openclaw gateway stop

# Force kill all OpenClaw processes
Get-Process | Where-Object { 
    $_.ProcessName -eq "node" -and 
    $_.CommandLine -match "openclaw"
} | Stop-Process -Force

# Kill specific PIDs if known
Stop-Process -Id <PID> -Force
```

### Restart OpenClaw
```powershell
# Full restart sequence
openclaw gateway stop
Start-Sleep 5
openclaw gateway start

# Or automated restart script
$script = @"
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep 3
cd C:\Users\quent\.openclaw
.\gateway.cmd
"@
Invoke-Expression $script
```

### Auto-Recovery
```powershell
# Check if responsive, restart if not
try {
    $response = Invoke-WebRequest -Uri "http://localhost:18789/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "OpenClaw is healthy"
    }
} catch {
    Write-Host "OpenClaw unresponsive, restarting..."
    # Stop existing
    Get-Process node | Where-Object { $_.Path -match "openclaw" } | Stop-Process -Force
    Start-Sleep 5
    # Start new
    cd C:\Users\quent\.openclaw
    Start-Process -FilePath ".\gateway.cmd" -WindowStyle Hidden
}
```

## Recovery Scenarios

### Scenario 1: Gateway Port Already in Use
```powershell
# Find process using port 18789
Get-NetTCPConnection -LocalPort 18789 | Select-Object OwningProcess
# Kill it
Stop-Process -Id <PID> -Force
# Restart OpenClaw
```

### Scenario 2: Config Corruption
```powershell
# Restore from backup
Copy-Item "C:\Users\quent\.openclaw\.clobbered.*" "C:\Users\quent\.openclaw\openclaw.json"
# Or use doctor
openclaw doctor --fix
```

### Scenario 3: Memory Exhaustion
```powershell
# Check memory
$mem = Get-CimInstance Win32_OperatingSystem
if ($mem.FreePhysicalMemory / $mem.TotalVisibleMemorySize -lt 0.1) {
    # Kill Chrome first
    Get-Process chrome | Stop-Process -Force -ErrorAction SilentlyContinue
    # Then restart OpenClaw
    Restart-Service -Name "OpenClaw" -ErrorAction SilentlyContinue
}
```

## Cron Jobs for Auto-Maintenance

### Health Check Every 15 Minutes
```json
{
  "name": "openclaw-health-check",
  "schedule": "*/15 * * * *",
  "command": "powershell -Command \"& {\n    try {\n        $r = Invoke-WebRequest 'http://localhost:18789/health' -TimeoutSec 5\n        if ($r.StatusCode -ne 200) { throw 'Unhealthy' }\n    } catch {\n        Get-Process node | Where-Object { $_.Path -match 'openclaw' } | Stop-Process -Force\n        Start-Sleep 3\n        cd C:\\Users\\quent\\.openclaw\n        .\\gateway.cmd\n    }\n}"
}
```

### Daily Restart at 4 AM
```json
{
  "name": "openclaw-daily-restart",
  "schedule": "0 4 * * *",
  "command": "powershell -Command \"& {\n    openclaw gateway stop\n    Start-Sleep 10\n    openclaw gateway start\n}"
}
```

## Windows Service Setup (Optional)

Create a Windows service for auto-start:
```powershell
# Using nssm (Non-Sucking Service Manager)
# Download from https://nssm.cc/

nssm install OpenClaw "C:\Users\quent\.openclaw\gateway.cmd"
nssm set OpenClaw DisplayName "OpenClaw Gateway"
nssm set OpenClaw Start SERVICE_AUTO_START
nssm start OpenClaw
```

## Log Monitoring

```powershell
# Watch logs in real-time
Get-Content C:\Users\quent\.openclaw\logs\gateway.log -Wait

# Check for errors in last hour
Get-ChildItem C:\Users\quent\.openclaw\logs\*.log | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-1) } |
    Select-String -Pattern "ERROR|FATAL|CRITICAL"
```

## Integration with OpenClaw

When using this skill from within OpenClaw:
- Be careful with `restart` as it will interrupt the current session
- Use `stop` + `start` sequence for safer restart
- Always verify status after restart
- Log all actions to `memory/openclaw_lifecycle.log`

## Safety

⚠️ **WARNING**: Restarting OpenClaw will:
- Interrupt active conversations
- Kill running cron jobs
- Reset websocket connections
- Clear in-memory state

Always:
1. Notify user before restart
2. Save any pending work
3. Use graceful shutdown when possible
4. Verify restart succeeded
