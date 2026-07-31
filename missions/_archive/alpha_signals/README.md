# 🤖 Alpha Signals Bot

Automated trading signal generator that connects to existing research infrastructure and delivers BUY/HOLD/SELL signals with confidence levels via Telegram.

## Features

- **Signal Generation**: Leverages existing enhanced research v2.0 (price, technical, sentiment)
- **Confidence Scoring**: HIGH/MEDIUM/LOW based on data quality and coverage
- **Telegram Formatting**: Rich formatted messages with emojis and visual indicators
- **Signal History**: Tracks changes over time with 90-day retention
- **Change Detection**: Alerts when signals upgrade/downgrade
- **Multiple Output Modes**: Console, file, or Telegram

## Architecture

```
missions/alpha_signals/
├── bot.js                  # Main bot controller
├── signal_generator.js     # Signal generation logic
├── telegram_formatter.js   # Message formatting
├── runner.ps1             # PowerShell execution wrapper
├── data/                   # Signal history storage
└── README.md              # This file
```

## Quick Start

### Generate Signals (Console)
```powershell
cd missions/alpha_signals
node bot.js run
```

### Daily Report
```powershell
node bot.js daily
```

### Alert Check (Urgent Only)
```powershell
node bot.js alert
```

### PowerShell Wrapper
```powershell
.\runner.ps1 -Command daily
.\runner.ps1 -Command alert -Summary
```

## Signal Levels

| Score | Signal | Emoji | Action | Urgency |
|-------|--------|-------|--------|---------|
| ≥3 | STRONG BUY | 🟢🟢🟢 | ACCUMULATE | IMMEDIATE |
| ≥2 | BUY | 🟢🟢 | ENTER | TODAY |
| ≥1 | WEAK BUY | 🟢 | WATCH | THIS WEEK |
| ≥-1 | HOLD | ⚪ | MONITOR | NONE |
| ≥-2 | WEAK SELL | 🔴 | REDUCE | THIS WEEK |
| ≥-3 | SELL | 🔴🔴 | EXIT | TODAY |
| <-3 | STRONG SELL | 🔴🔴🔴 | EXIT NOW | IMMEDIATE |

## Confidence Calculation

Confidence is based on:
- **Live data sources** (+2): Twelve Data, Yahoo Finance
- **Cached data** (+1): Local cache fallback
- **Full TA coverage** (+2): All 11 indicators available
- **Partial TA** (+1): Some indicators missing
- **Sentiment sources** (+1): Multiple news/search sources

| Score | Confidence |
|-------|-----------|
| ≥5 | HIGH ✅ |
| ≥3 | MEDIUM ⚠️ |
| <3 | LOW ❓ |

## Configuration

Create `config.json` in the bot directory:

```json
{
  "outputMode": "console",
  "telegramChatId": null,
  "assets": ["BTC", "ETH", "MSTR", "HIMS", "COIN", "TSLA"],
  "alertThreshold": {
    "strongBuy": 3,
    "buy": 2,
    "strongSell": -3,
    "sell": -2
  }
}
```

## Scheduled Execution

### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task → "Alpha Signals Daily"
3. Trigger: Daily at 09:00 AM
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\Users\quent\.openclaw\workspace\missions\alpha_signals\runner.ps1" -Command daily`

### Cron (Linux/Mac)
```bash
# Daily at 9 AM
0 9 * * * cd /path/to/alpha_signals && node bot.js daily

# Alert check every 6 hours
0 */6 * * * cd /path/to/alpha_signals && node bot.js alert
```

## Telegram Integration

To enable Telegram output:

1. Set `outputMode: "telegram"` in config.json
2. Set `telegramChatId` to your chat ID
3. Requires Telegram Bot token (set via environment variable `TELEGRAM_BOT_TOKEN`)

## Data Sources

The bot connects to existing research infrastructure:
- **Market Data**: `mission_control/market_data_service.js`
- **Technical Analysis**: `mission_control/enhanced_ta_analysis.js`
- **Sentiment**: `mission_control/enhanced_sentiment.js`
- **Composite Research**: `mission_control/enhanced_research.js`

## Output Examples

### Daily Report
```
🤖 ALPHA SIGNALS BOT 🤖
═══════════════════════════════
🕐 Friday, July 24, 2026, 3:00 PM

📊 MARKET OVERVIEW
🟢 Buy Signals: 2
🔴 Sell Signals: 1
⚪ Hold/Neutral: 3

🔥 TOP BUY OPPORTUNITIES
🟢🟢 HIMS — Score: 2 | Conf: MEDIUM
   💰 $32.74 (+3.35%)
   ▶️ ENTER

📋 ALL SIGNALS
...
```

### Urgent Alert
```
⚡ URGENT SIGNAL ALERT ⚡

🟢🟢🟢 BTC — Bitcoin
📊 SIGNAL: STRONG BUY (HIGH confidence)
💰 $65,467.53 📈 +0.57%

⚡ Action: ACCUMULATE
🕐 Urgency: IMMEDIATE
```

## Logs

Logs are stored in `data/logs/` with timestamps:
- `bot_run_YYYY-MM-DD_HH-mm-ss.log`
- Signal history in `data/signal_history.json`

## Development

### Add New Assets
Edit `ASSETS` in `signal_generator.js`:
```javascript
const ASSETS = {
  NEWCOIN: { name: 'New Coin', type: 'crypto', priority: 'MEDIUM' }
};
```

### Customize Formatting
Edit `telegram_formatter.js` to change message templates, emojis, or layout.

## Version History

- **v1.0.0** (Jul 24, 2026): Initial release with signal generation, Telegram formatting, and daily scheduling

## License

Private — For personal use only.
