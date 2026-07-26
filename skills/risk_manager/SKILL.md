# Risk Manager Skill

## Description
Comprehensive trading risk management system for portfolio and position-level risk assessment.

## Capabilities
- Position size calculation based on risk parameters
- Portfolio risk assessment (concentration, correlation)
- Dynamic stop-loss level setting
- Maximum drawdown tracking and alerting
- Risk/reward ratio analysis
- Value at Risk (VaR) calculation
- Risk-adjusted returns (Sharpe, Sortino ratios)
- Correlation matrix analysis
- Position heat maps
- Saves all risk assessments to memory/ directory

## Quick Start
```powershell
# Test with sample data
node skills/risk_manager/risk_manager.js --test

# Calculate position for a trade
node skills/risk_manager/risk_manager.js --position --symbol=BTC --price=65000 --stop=62000 --risk=2

# Portfolio risk report
node skills/risk_manager/risk_manager.js --portfolio

# Interactive mode
node skills/risk_manager/risk_manager.js --interactive
```

## Risk Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| Max Risk/Trade | 2% | Max portfolio risk per trade |
| Max Portfolio Risk | 6% | Total portfolio at risk |
| Max Drawdown Alert | 15% | Alert threshold |
| Max Drawdown Stop | 25% | Hard stop, halt trading |
| Min R:R Ratio | 2:1 | Minimum risk/reward |
| Max Position Size | 20% | Max single position |

## Files
- `risk_manager.js` — Core risk engine
- `SKILL.md` — This file

## Memory Output
Risk assessments saved to:
- `memory/risk_assessment_YYYY-MM-DD.json`
- `memory/portfolio_risk_YYYY-MM-DD.json`
- `memory/drawdown_log.json` (running log)
