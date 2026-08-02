# Alpha Signals Trading Bot - PowerShell Runner
# Usage: .\run_bot.ps1 [scan|execute|update|status|daily|backtest|check]

param(
    [Parameter(Mandatory=$false)]
    [string]$Command = "status",
    
    [Parameter(Mandatory=$false)]
    [string]$Ticker,
    
    [Parameter(Mandatory=$false)]
    [string]$Reason
)

$BotPath = Join-Path $PSScriptRoot "alpha_signals_bot.js"

if (-not (Test-Path $BotPath)) {
    Write-Error "Bot not found at $BotPath"
    exit 1
}

try {
    Push-Location $PSScriptRoot
    
    switch ($Command.ToLower()) {
        "scan" {
            Write-Host "🔍 Scanning for Alpha Signals..." -ForegroundColor Cyan
            node alpha_signals_bot.js scan
        }
        "execute" {
            Write-Host "🎯 Executing trades from signals..." -ForegroundColor Green
            node alpha_signals_bot.js execute
        }
        "update" {
            Write-Host "📊 Updating portfolio..." -ForegroundColor Yellow
            node alpha_signals_bot.js update
        }
        "status" {
            Write-Host "📈 Portfolio Status" -ForegroundColor Cyan
            node alpha_signals_bot.js status
        }
        "daily" {
            Write-Host "🚀 Running daily trading cycle..." -ForegroundColor Magenta
            node alpha_signals_bot.js daily
        }
        "backtest" {
            Write-Host "📊 Backtesting signal accuracy..." -ForegroundColor Blue
            node alpha_signals_bot.js backtest
        }
        "check" {
            Write-Host "🎯 Checking readiness for real money..." -ForegroundColor Green
            node alpha_signals_bot.js check
        }
        "sell" {
            if (-not $Ticker) {
                Write-Error "Usage: .\run_bot.ps1 sell TICKER [REASON]"
                exit 1
            }
            Write-Host "🔴 Selling $Ticker..." -ForegroundColor Red
            node alpha_signals_bot.js sell $Ticker ($Reason -or "Manual sell")
        }
        default {
            Write-Host @"
Alpha Signals Trading Bot v1.0

Commands:
  scan       - Generate signals from research
  execute    - Execute trades from signals
  update     - Update prices and show status
  status     - Show portfolio status
  daily      - Run full daily trading cycle
  backtest   - Backtest signal accuracy
  check      - Check if ready for real money
  sell TICKER [REASON] - Manually sell position

Examples:
  .\run_bot.ps1 scan
  .\run_bot.ps1 daily
  .\run_bot.ps1 sell BTC "Stop loss hit"
"@ -ForegroundColor White
        }
    }
} finally {
    Pop-Location
}
