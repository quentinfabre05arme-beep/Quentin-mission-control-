# Alpha Fund v3.0 — Unified Investment System

## Architecture

```
┌─────────────────────────────────────────┐
│         ALPHA FUND v3.0 (MERGED)        │
├─────────────────────────────────────────┤
│  Research Layer                          │
│  ├── research/enhanced_indicators.js     │
│  ├── research/asymmetry_scanner.js       │
│  ├── research/alternative_data.js        │
│  └── research/composite_scoring.js     │
├─────────────────────────────────────────┤
│  Intelligence Layer                      │
│  ├── intelligence/catalyst_watcher.js  │
│  ├── intelligence/sec_13f_scraper.js     │
│  └── intelligence/risk_manager.js      │
├─────────────────────────────────────────┤
│  Execution Layer                         │
│  ├── execution/signal_generator.js       │
│  ├── execution/position_sizer.js       │
│  ├── execution/paper_trader.js         │
│  └── execution/alpaca_connector.js     │
├─────────────────────────────────────────┤
│  Dashboard Layer                         │
│  ├── dashboard/index.html                │
│  └── dashboard/portfolio.html            │
├─────────────────────────────────────────┤
│  Core                                    │
│  └── orchestrator.js — Single entry point│
└─────────────────────────────────────────┘
```

## Quick Start

```powershell
# Full daily cycle
node alpha_fund_v3/orchestrator.js daily

# Research only
node alpha_fund_v3/orchestrator.js research

# Generate signals
node alpha_fund_v3/orchestrator.js signals

# Paper trade
node alpha_fund_v3/orchestrator.js trade

# Full status
node alpha_fund_v3/orchestrator.js status
```

## Merged From
- `mission_control/` — Research system
- `investment_fund/` — Alpha Fund research & scanners
- `investment_fund/trading_bot/` — Execution bot

## Status: ACTIVE | Version: 3.0 | Created: 2026-08-02
