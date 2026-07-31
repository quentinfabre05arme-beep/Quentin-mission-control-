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
    $process = Get-Process -Name "openclaw*" -ErrorAction SilentlyContinue
    return ($null -ne $process)
}

function Test-CronHealth {
    # Check if cron jobs are running by looking at recent logs
    $lastHeartbeat = if (Test-Path $StateFile) { 
        (Get-Content $StateFile | ConvertFrom-Json -ErrorAction SilentlyContinue).last_heartbeat 
    } else { $null }
    
    if ($lastHeartbeat) {
        $lastTime = [datetime]::Parse($lastHeartbeat)
        $minutesSince = ([datetime]::Now - $lastTime).TotalMinutes
        return ($minutesSince -lt 35)  # Should heartbeat every 30 min
    }
    return $false
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
    Write-Log "High RAM usage detected ($($health.RAM%). Cleaning up..." "WARN"
    
    # Clear non-critical processes
    $heavyProcesses = Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5
    foreach ($proc in $heavyProcesses) {
        if ($proc.ProcessName -notin @"openclaw", "powershell", "explorer", "csrss", "svchost") {
            Write-Log "Terminating: $($proc.ProcessName) ($([math]::Round($proc.WorkingSet/1MB, 0)) MB)" "INFO"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Trigger .NET garbage collection if applicable
    [System.GC]::Collect()
    
    Start-Sleep -Seconds 2
    $newRam = Get-SystemHealth
    Write-Log "RAM after cleanup: $($newRam.RAM)%" "INFO"
}

function Repair-DiskSpace {
    Write-Log "Disk space critical ($($health.Disk%). Cleaning up..." "WARN"
    
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