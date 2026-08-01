# Claw Alpha Fund

Autonomous paper trading mission for the OpenClaw workspace.

## Philosophy
- Long-only, no leverage
- Cash-secured option overlays (covered calls, protective puts, cash-secured puts)
- Broad cross-asset research (equity, crypto, FX, commodities, fixed income)
- Self-improving via daily backtests

## Quick Start

```powershell
cd alpha_fund
npm install
node fund_manager.js --run     # Execute one daily cycle
node fund_manager.js --report  # Run cycle + send daily report via Gmail
node backtest_engine.js        # Run strategy backtests
```

## Architecture

| File | Role |
|------|------|
| `fund_manager.js` | Main engine: scan, signal, rebalance, track |
| `strategies/momentum.js` | SMA/RSI momentum signals |
| `strategies/mean_reversion.js` | Z-score/RSI mean reversion |
| `strategies/value.js` | Deep-value / percentile ranking |
| `strategies/macro.js` | Risk-on/off macro regime |
| `risk_manager.js` | Position sizing, stop checks, option guardrails |
| `research_engine.js` | Broad market scanning |
| `daily_report.js` | Plain-text report + Gmail OAuth send |
| `backtest_engine.js` | Historical backtesting and summary |
| `utils/market_data.js` | Multi-source price fetcher |

## Data
- `data/portfolio.json` — positions and cash
- `data/paper_ledger.json` — simulated trades
- `data/performance.json` — NAV series and metrics
- `data/market_cache.json` — transient price cache
- `data/backtest_results.json` — latest backtest output
- `reports/` — generated daily reports

## Risk Guardrails
- Max 5% single position
- Max 20% sector concentration
- Hard stop 15%, trailing stop 10%
- Max 20% drawdown stops new entries
- Options only: covered calls, protective puts, cash-secured puts
- No leverage, no margin, no short selling

## Gmail OAuth
Place credentials in `~/.openclaw/google_credentials.json` and token in `~/.openclaw/google_token.json`. The daily report will be sent to `reportRecipients` in `config.json`.
