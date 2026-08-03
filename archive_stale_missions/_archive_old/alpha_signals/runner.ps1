# Alpha Signals Bot - PowerShell Runner
# For Windows Task Scheduler or manual execution

param(
    [Parameter()]
    [ValidateSet("run", "daily", "alert", "config")]
    [string]$Command = "run",

    [Parameter()]
    [switch]$Summary,

    [Parameter()]
    [switch]$Json,

    [Parameter()]
    [string]$Workspace = $PSScriptRoot
)

# Resolve workspace path
$Workspace = Resolve-Path $Workspace
$BotPath = Join-Path $Workspace "bot.js"

# Logging
$LogDir = Join-Path $Workspace "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = Join-Path $LogDir "bot_${Command}_${Timestamp}.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$time] [$Level] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

# Check Node.js
Write-Log "Alpha Signals Bot starting..."
Write-Log "Command: $Command"
Write-Log "Workspace: $Workspace"

try {
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }
    Write-Log "Node.js version: $nodeVersion"
} catch {
    Write-Log "ERROR: Node.js is required but not found" "ERROR"
    exit 1
}

# Check bot file
if (-not (Test-Path $BotPath)) {
    Write-Log "ERROR: Bot file not found at $BotPath" "ERROR"
    exit 1
}

# Build command
$cmdArgs = @($Command)
if ($Summary) { $cmdArgs += "--summary" }
if ($Json) { $cmdArgs += "--json" }

Write-Log "Running: node $BotPath $cmdArgs"

# Execute bot
try {
    $output = node $BotPath $cmdArgs 2>&1
    $exitCode = $LASTEXITCODE

    # Log output
    $output | ForEach-Object { Write-Log $_ }

    if ($exitCode -ne 0) {
        Write-Log "Bot exited with code $exitCode" "WARN"
    } else {
        Write-Log "Bot completed successfully"
    }

    Write-Log "Log saved to: $LogFile"
    exit $exitCode
} catch {
    Write-Log "ERROR: $($_.Exception.Message)" "ERROR"
    exit 1
}
