# Claw Recovery Agent
# Ensures Claw never stops operating

param(
    [switch]$Check,
    [switch]$Repair,
    [switch]$Status
)

$StateFile = "C:\Users\quent\.openclaw\workspace\recovery\state\heartbeat.json"
$LogFile = "C:\Users\quent\.openclaw\workspace\recovery\logs\recovery.log"

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
    Write-Host $logEntry
}

function Get-SystemHealth {
    $ram = Get-CimInstance Win32_OperatingSystem | Select-Object @{Name="Used";Expression={[math]::Round(($_.TotalVisibleMemorySize - $_.FreePhysicalMemory) / $_.TotalVisibleMemorySize * 100, 1)}}
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object @{Name="Used";Expression={[math]::Round(($_.Size - $_.FreeSpace) / $_.Size * 100, 1)}}
    
    return @{
        RAM = $ram.Used
        Disk = $disk.Used
        Timestamp = Get-Date -Format "o"
    }
}

function Test-OpenClawRunning {
    # Gateway runs as node.exe on port 18789, not process name openclaw*
    $listeners = Get-NetTCPConnection -LocalPort 18789 -State Listen -ErrorAction SilentlyContinue
    if ($listeners) { return $true }
    $nodeGw = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'openclaw.*gateway|dist\\index\.js gateway' }
    return ($null -ne $nodeGw)
}

function Test-CronHealth {
    # Prefer workspace heartbeat-state; fall back to recovery state file
    $hbPath = "C:\Users\quent\.openclaw\workspace\memory\heartbeat-state.json"
    if (Test-Path $hbPath) {
        try {
            $hb = Get-Content $hbPath -Raw | ConvertFrom-Json
            $ts = $hb.lastChecks.heartbeat
            if ($ts) {
                # unix seconds
                if ($ts -gt 1000000000000) { $last = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$ts).LocalDateTime }
                else { $last = [DateTimeOffset]::FromUnixTimeSeconds([int64]$ts).LocalDateTime }
                $minutesSince = ([datetime]::Now - $last).TotalMinutes
                return ($minutesSince -lt 360)  # health cron every 6h + slack
            }
        } catch {}
    }

    $lastHeartbeat = if (Test-Path $StateFile) {
        (Get-Content $StateFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue).last_heartbeat
    } else { $null }

    if ($lastHeartbeat) {
        $lastTime = [datetime]::Parse($lastHeartbeat)
        $minutesSince = ([datetime]::Now - $lastTime).TotalMinutes
        return ($minutesSince -lt 360)
    }
    # If no history yet, do not fail closed on first run
    return $true
}

function Repair-OpenClaw {
    Write-Log "Attempting to repair OpenClaw..." "WARN"
    
    # Try graceful restart first
    $process = Get-Process -Name "openclaw*" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Log "Stopping existing process..." "INFO"
        Stop-Process -Name "openclaw*" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # Restart
    Write-Log "Starting OpenClaw..." "INFO"
    Start-Process -FilePath "openclaw" -ArgumentList "gateway start" -WindowStyle Hidden
    Start-Sleep -Seconds 10
    
    if (Test-OpenClawRunning) {
        Write-Log "OpenClaw restarted successfully" "INFO"
        return $true
    } else {
        Write-Log "Failed to restart OpenClaw" "ERROR"
        return $false
    }
}

function Repair-HighRAM {
    $ramPct = $health.RAM
    Write-Log "High RAM usage detected ($ramPct pct). Cleaning up temp only (no process kills)." "WARN"

    # Safe cleanup only — never kill user apps/chrome/node gateway
    $cut = (Get-Date).AddDays(-1)
    Get-ChildItem -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { -not $_.PSIsContainer -and $_.LastWriteTime -lt $cut } |
        ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }

    [System.GC]::Collect()
    Start-Sleep -Seconds 2
    $newRam = Get-SystemHealth
    Write-Log "RAM after cleanup: $($newRam.RAM) pct" "INFO"
}

function Repair-DiskSpace {
    $diskPct = $health.Disk
    Write-Log "Disk space critical ($diskPct pct). Cleaning up..." "WARN"
    
    # Clean temp files
    Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Compress old logs
    $logDir = "C:\Users\quent\.openclaw\workspace\logs"
    if (Test-Path $logDir) {
        $oldLogs = Get-ChildItem $logDir -Filter "*.log" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
        foreach ($log in $oldLogs) {
            Compress-Archive -Path $log.FullName -DestinationPath "$($log.FullName).zip" -Force
            Remove-Item $log.FullName -Force
        }
    }
    
    Write-Log "Disk cleanup completed" "INFO"
}

# ═══════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════

if (-not (Test-Path (Split-Path $LogFile -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path $LogFile -Parent) -Force | Out-Null
}

$health = Get-SystemHealth
Write-Log "Health check - RAM: $($health.RAM)%, Disk: $($health.Disk)%" "INFO"

if ($Status) {
    Write-Host "═══════════════════════════════════════"
    Write-Host "  CLAW RECOVERY AGENT STATUS"
    Write-Host "═══════════════════════════════════════"
    Write-Host "RAM Usage:    $($health.RAM)%"
    Write-Host "Disk Usage:   $($health.Disk)%"
    Write-Host "OpenClaw:     $(if (Test-OpenClawRunning) { 'RUNNING ✅' } else { 'DOWN ❌' })"
    Write-Host "Cron Health:  $(if (Test-CronHealth) { 'HEALTHY ✅' } else { 'STALE ⚠️' })"
    Write-Host "Last Check:   $(Get-Date -Format 'HH:mm:ss')"
    Write-Host "═══════════════════════════════════════"
    exit 0
}

if ($Repair) {
    if (-not (Test-OpenClawRunning)) {
        Repair-OpenClaw
    }
    if ($health.RAM -gt 90) {
        Repair-HighRAM
    }
    if ($health.Disk -gt 90) {
        Repair-DiskSpace
    }
    exit 0
}

# Default: Full health check with auto-repair
$issues = @()

if (-not (Test-OpenClawRunning)) {
    $issues += "OpenClaw not running"
    Repair-OpenClaw
}

if (-not (Test-CronHealth)) {
    $issues += "Cron jobs stale"
    # Don't auto-repair cron, just log. Will catch up on next heartbeat.
}

if ($health.RAM -gt 90) {
    $issues += "RAM critical: $($health.RAM)%"
    Repair-HighRAM
}

if ($health.Disk -gt 90) {
    $issues += "Disk critical: $($health.Disk)%"
    Repair-DiskSpace
}

# Update heartbeat state
$state = @{
    last_heartbeat = Get-Date -Format "o"
    last_check = Get-Date -Format "o"
    ram_percent = $health.RAM
    disk_percent = $health.Disk
    openclaw_running = Test-OpenClawRunning
    cron_healthy = Test-CronHealth
    issues_found = $issues
    repairs_made = @()
} | ConvertTo-Json -Depth 3

$state | Set-Content $StateFile

if ($issues.Count -gt 0) {
    Write-Log "Issues found and repaired: $($issues -join ', ')" "WARN"
} else {
    Write-Log "All systems healthy" "INFO"
}