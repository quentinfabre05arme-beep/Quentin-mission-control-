# Alpha Signals Trading Bot — Setup Guide

## Quick Start (5 minutes)

### 1. Verify Installation

```powershell
cd investment_fund\trading_bot
node alpha_signals_bot.js status
```

You should see your current paper portfolio.

### 2. Run Your First Signal Scan

```powershell
node alpha_signals_bot.js scan
```

This generates BUY/HOLD/SELL signals based on current market data.

### 3. Run Daily Trading Cycle

```powershell
node alpha_signals_bot.js daily
```

This:
1. Updates all position prices
2. Checks stop losses and take profits
3. Scans for new entry signals
4. Executes trades (if slots available)
5. Updates performance tracking

## Optional: Connect Alpaca Paper Trading

For real broker execution (still paper money, but more realistic):

### Step 1: Get Free Alpaca Account

1. Go to https://alpaca.markets
2. Sign up (free, no credit card)
3. Enable Paper Trading mode
4. Go to Dashboard → API Keys
5. Copy your API Key ID and Secret Key

### Step 2: Set Environment Variables

```powershell
# PowerShell
$env:ALPACA_API_KEY = "PK_XXXXXXXXXXXXXXXXXX"
$env:ALPACA_SECRET_KEY = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# To make permanent (optional):
[Environment]::SetEnvironmentVariable("ALPACA_API_KEY", "PK_XXX", "User")
[Environment]::SetEnvironmentVariable("ALPACA_SECRET_KEY", "XXX", "User")
```

### Step 3: Test Connection

```powershell
node alpaca_connector.js test
```

Expected output:
```
✅ Account connected!
   Account ID: PA-XXXXXXX
   Status: ACTIVE
   Cash: $100000.00
   Equity: $100000.00
```

### Step 4: Sync Portfolios

```powershell
node alpaca_connector.js sync
```

This syncs your local portfolio with Alpaca's paper account.

## Automation

### Run Daily via Task Scheduler (Windows)

```powershell
# Create scheduled task for daily cycle
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Users\quent\.openclaw\workspace\investment_fund\trading_bot\run_bot.ps1 daily"
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
Register-ScheduledTask -TaskName "AlphaSignals-Daily" -Action $action -Trigger $trigger -Description "Alpha Signals Bot Daily Cycle"
```

### Run Every 4 Hours (Research Schedule)

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Users\quent\.openclaw\workspace\investment_fund\trading_bot\run_bot.ps1 daily"
$trigger = New-ScheduledTaskTrigger -Once -At "09:00" -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 365)
Register-ScheduledTask -TaskName "AlphaSignals-4Hour" -Action $action -Trigger $trigger -Description "Alpha Signals Bot 4-hour cycle"
```

## Understanding the Output

### Signal Scan Output

```
📈 BUY SIGNALS (3):
   🔥 BTC: STRONG_BUY (Score: 3, HIGH)
      Price: $64,978 | 24h: -1.0%
      Size: $2,250 | Stop: $59,780 | Target: $81,223
      • Oversold bounce potential
      • Volatility expansion (dip)

   ✅ ETH: BUY (Score: 2, MEDIUM)
      Price: $1,881 | 24h: -0.5%
      Size: $1,500 | Stop: $1,731 | Target: $2,351
      • Negative momentum (-0.5%)
      • Oversold bounce potential
```

- **Score**: Higher = stronger signal (3=STRONG_BUY, 2=BUY, 1=WEAK_BUY)
- **Confidence**: HIGH/MEDIUM/LOW (only trade MEDIUM+)
- **Size**: Position size in USD (scaled by conviction)
- **Stop/Target**: Automatic risk management levels

### Portfolio Status Output

```
📊 Portfolio: alpha-signals-paper-001
   Mode: 📄 PAPER TRADING
   Initial: $10,000
   Current: $9,850 (-1.50%)
   Cash: $3,500
   Positions: 5/10
   Days Trading: 7

📈 Performance:
   Trades: 12
   Win Rate: 58.3%
   Max Drawdown: 8.2%
```

### Ready for Real Money Check

```powershell
node alpha_signals_bot.js check
```

Output when ready:
```
🎉 READY FOR REAL MONEY TRADING!
   1. Get Alpaca API keys from https://alpaca.markets
   2. Set ALPACA_API_KEY and ALPACA_SECRET_KEY env vars
   3. Set PAPER_MODE: false in CONFIG
   4. Start with small position sizes
```

## Troubleshooting

### "Using fallback prices"

The Twelve Data API rate limit was hit. The bot uses last-known prices.

**Fix**: Wait 1 minute and retry, or check your API key in `TOOLS.md`.

### "No actionable signals found"

Current market conditions don't meet entry criteria.

**This is normal** — the bot only trades when signals are strong enough.

### "Max positions reached"

Portfolio already has 10 positions (max limit).

**Fix**: Wait for positions to hit targets or stops, or manually sell with `node alpha_signals_bot.js sell TICKER`.

### "Not enough cash"

Cash is below minimum trade size ($100).

**Fix**: Wait for exits to free cash, or the bot will auto-exit positions hitting stops.

## File Reference

| File | Purpose |
|------|---------|
| `alpha_signals_bot.js` | Main trading engine |
| `alpaca_connector.js` | Broker API integration |
| `signal_bridge.js` | Connects to research system |
| `run_bot.ps1` | PowerShell convenience runner |
| `data/signals_history.json` | All generated signals |
| `data/signal_performance.json` | Accuracy tracking |
| `data/bot_trades.json` | Detailed trade log |
| `../paper_trading/PAPER_PORTFOLIO.json` | Portfolio state |

## Safety Features

1. **Paper mode only** — No real money until you explicitly disable
2. **30-day gate** — Requires 30 days profitable before real money suggestion
3. **Position limits** — Max 10 positions, max 15% each
4. **Stop losses** — Automatic -8% stops on every trade
5. **Daily loss limit** — Stops trading if down -3% in a day
6. **Max drawdown** — Hard stop at -25% total
7. **Signal confidence** — Only trades MEDIUM+ confidence

## Next Steps

1. ✅ Run `daily` every day for 30 days
2. ✅ Review `check` output weekly
3. ✅ Connect Alpaca when ready
4. ⏳ Gradually increase position sizes
5. ⏳ Transition to real money (your decision)
