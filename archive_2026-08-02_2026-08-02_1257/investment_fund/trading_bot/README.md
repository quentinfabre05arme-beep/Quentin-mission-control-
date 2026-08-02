# Alpha Signals Trading Bot v1.0

Realistic automated trading bot using Alpha Fund research signals. Paper trading mode (no real money) with Alpaca API integration.

## Architecture

```
Research System (existing)
  ├── Price Data (Twelve Data, CoinGecko)
  ├── Technical Analysis (RSI, MACD, SMA)
  ├── Sentiment Analysis (Serper.dev)
  └── Composite Score (BUY/HOLD/SELL)
           │
           ▼
Alpha Signals Bot (NEW)
  ├── Signal Generator (converts research → actionable)
  ├── Risk Manager (position sizing, stops)
  ├── Paper Trader (internal or Alpaca API)
  └── Performance Tracker (accuracy, 30-day rule)
```

## Files

| File | Purpose |
|------|---------|
| `alpha_signals_bot.js` | Main bot engine |
| `alpaca_connector.js` | Real broker API (paper trading) |
| `run_bot.ps1` | PowerShell runner |
| `data/signals_history.json` | Signal database |
| `data/signal_performance.json` | Accuracy tracking |
| `data/bot_trades.json` | Trade execution log |

## Quick Start

### 1. Run in Paper Mode (no API keys needed)

```powershell
# Scan for signals
cd investment_fund\trading_bot
node alpha_signals_bot.js scan

# Run daily cycle (scan + execute)
node alpha_signals_bot.js daily

# Check status
node alpha_signals_bot.js status

# Backtest accuracy
node alpha_signals_bot.js backtest
```

### 2. Connect to Alpaca (Optional - Real Paper Trading)

```powershell
# Set API keys (free at https://alpaca.markets)
$env:ALPACA_API_KEY = "PK_XXXXXXXX"
$env:ALPACA_SECRET_KEY = "XXXXXXXX"

# Test connection
node alpaca_connector.js test

# Sync local portfolio with Alpaca
node alpaca_connector.js sync

# Submit real paper trade
node alpaca_connector.js buy AAPL 1
```

## How It Works

### Signal Generation
- Pulls prices from Twelve Data API (free tier)
- Generates BUY/SELL/HOLD signals based on:
  - Price momentum (24h change)
  - Mean reversion patterns
  - Volatility expansion
- Assigns confidence: LOW / MEDIUM / HIGH

### Trading Rules
- **Entry**: Only MEDIUM+ confidence, score ≥ 1
- **Position Size**: Max 15% per position, scaled by conviction
- **Stop Loss**: -8% from entry
- **Take Profit**: +25% from entry
- **Max Positions**: 10
- **Max Drawdown**: 25% hard stop

### Performance Tracking
- Tracks signal accuracy (% correct predictions)
- Tracks win rate, max drawdown, streaks
- **30-Day Rule**: Only suggests real money after:
  - 30 days of paper trading
  - Positive total return
  - ≥55% signal accuracy
  - ≥50% win rate
  - ≤25% max drawdown

## Commands

```
node alpha_signals_bot.js scan      # Generate signals
node alpha_signals_bot.js execute   # Execute trades
node alpha_signals_bot.js update    # Update prices
node alpha_signals_bot.js status    # Portfolio view
node alpha_signals_bot.js daily     # Full cycle
node alpha_signals_bot.js backtest  # Signal accuracy
node alpha_signals_bot.js check     # Ready for real money?
node alpha_signals_bot.js sell BTC "Reason"  # Manual sell
```

## Signals vs Existing Research

The bot uses simplified signal logic that aligns with the existing enhanced research system:

| Research Output | Bot Signal | Action |
|-----------------|------------|--------|
| STRONG BUY (score +3) | STRONG_BUY | Enter 1.5x position |
| BUY (score +2) | BUY | Enter 1.0x position |
| WEAK BUY (score +1) | WEAK_BUY | Enter 0.5x position |
| HOLD (score 0) | HOLD | No action |
| SELL (score -2) | SELL | Exit position |

In the future, the bot can directly consume `enhanced_research.js` output.

## 30-Day Real Money Gate

The bot enforces a strict 30-day paper trading period. Only after:

1. ✅ 30+ days trading history
2. ✅ Positive overall return
3. ✅ ≥55% signal accuracy
4. ✅ ≥50% trade win rate
5. ✅ ≤25% max drawdown

Will it print the "ready for real money" message. Even then, user must:
- Get Alpaca API keys
- Manually set `PAPER_MODE: false`
- Start with small sizes

## Data Flow

```
Price APIs → Signal Generator → Risk Check → Paper Execute
                                              ↓
                                          Portfolio JSON
                                              ↓
                                      Performance Tracker
                                              ↓
                                        30-Day Gate?
```

## Next Steps

1. Run `node alpha_signals_bot.js daily` every day
2. After 7 days, run `check` to see progress
3. After 30 profitable days, connect Alpaca API
4. Gradually transition to real money (start small)

## Risk Disclaimer

This is educational software. Past paper trading performance does not guarantee future real-money results. Always:
- Start with paper trading
- Use position limits
- Never risk more than you can afford to lose
- Review and understand every trade before going live
