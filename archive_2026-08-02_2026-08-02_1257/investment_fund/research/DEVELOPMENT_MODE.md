# Alpha Fund — Research & Development Mode

## What is R&D Mode?

R&D Mode is a **safe experimentation sandbox** where the Alpha Fund can test new strategies, data sources, and algorithms without risking the live paper trading portfolio.

## R&D vs Production

| Aspect | R&D Mode | Production Mode |
|--------|----------|-----------------|
| **Purpose** | Test new ideas | Execute proven strategies |
| **Risk Level** | High (experimentation) | Controlled (validated) |
| **Position Size** | 0.1% test size | 1-5% standard size |
| **Data Sources** | Any (including experimental) | Vetted only |
| **Algorithms** | Beta versions | Stable versions |
| **Outcome Logging** | Detailed analysis | Performance tracking |
| **Failure Acceptable** | Yes (learning) | No (capital preservation) |

## Active R&D Projects

### Project 1: Alternative Data Integration
**Status:** 🟡 In Progress
**Hypothesis:** Options flow data improves hit rate by 15%
**Testing:** Compare predictions with/without options data
**ETA:** 1 week

### Project 2: Sentiment Analysis NLP
**Status:** 🟢 Complete
**Result:** +8% hit rate improvement
**Decision:** Promote to production

### Project 3: Machine Learning Scoring
**Status:** 🔴 Not Started
**Idea:** Train model on historical patterns
**Blocker:** Need 100+ completed trades for training data

### Project 4: International Market Expansion
**Status:** 🟡 In Progress
**Tickers:** ASML, TSM, BABA, TCEHY
**Challenge:** Different market hours, currency risk
**ETA:** 2 weeks

## R&D Pipeline

```
IDEA → HYPOTHESIS → BACKTEST → PAPER TEST → VALIDATE → PROMOTE/DROP
```

### Stage 1: Idea (1 day)
- Document concept
- Identify data needs
- Estimate resource requirements

### Stage 2: Hypothesis (2-3 days)
- Define success metric
- Set test parameters
- Create experiment plan

### Stage 3: Backtest (1 week)
- Historical simulation
- Measure against baseline
- Identify edge cases

### Stage 4: Paper Test (2 weeks)
- Live market test
- Small position size
- Daily monitoring

### Stage 5: Validate (1 week)
- Statistical significance check
- Risk/reward analysis
- Go/no-go decision

### Stage 6: Promote or Drop
- **Promote:** Move to production
- **Drop:** Archive learnings

## R&D Commands

```bash
# Run experiments
node investment_fund/research/experiment_runner.js --name options-flow

# Backtest strategy
node investment_fund/research/backtest_engine.js --strategy sentiment-v2

# Compare results
node investment_fund/research/compare_strategies.js baseline vs experiment

# Promote to production
node investment_fund/research/promote.js --experiment sentiment-v2
```

## R&D Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Active experiments | 3-5 | 2 |
| Experiment velocity | 2/week | 1/week |
| Success rate (promoted) | 30% | 50% |
| Time to validate | <3 weeks | 2 weeks avg |

## Ideas Backlog

1. **Options Unusual Activity** — Priority 1
2. **Crypto On-Chain Metrics** — Priority 1
3. **Earnings Call Sentiment** — Priority 2
4. **Satellite Imagery (retail)** — Priority 3
5. **Credit Card Spending Data** — Priority 3
6. **Reddit/Twitter NLP V2** — Priority 2

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-21 | Promote sentiment-v1 | +8% hit rate, stable over 50 trades |
| 2026-07-20 | Drop technical-only | Underperformed baseline by 12% |
| 2026-07-18 | Test options flow | High correlation in backtest |

---

*R&D Mode: Where breakthroughs happen before they touch real capital.*
