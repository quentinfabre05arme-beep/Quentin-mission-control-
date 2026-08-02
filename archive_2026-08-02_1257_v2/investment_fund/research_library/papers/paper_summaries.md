# Paper Summaries — Alpha Fund Research Library

Downloaded: 7 papers from SSRN (July 17, 2026)

---

## 1. The 10 Reasons Most Quantitative Strategies Fail
**Author:** Marcos López de Prado  
**File:** `10_reasons_quants_fail.pdf`

### Key Insights (TODO: Extract full notes)
- Overfitting on historical data
- Selection bias in strategy development
- Improper backtesting methods
- Transaction costs underestimated
- Survivorship bias in datasets

### Application for Alpha Fund:
- Build robust backtesting framework
- Use walk-forward validation
- Account for all trading costs

---

## 2. Advances in Financial Machine Learning — Introduction
**Author:** Marcos López de Prado  
**File:** `afml_intro.pdf`

### Key Insights
- Financial data is non-stationary (unlike image recognition)
- Standard ML tools fail without financial domain adaptation
- Feature importance ≠ feature selection
- Cross-validation must respect time ordering

### Application:
- Time-series aware train/test splits
- Purged cross-validation
- Meta-labeling for position sizing

---

## 3. Optimal Trading Strategies Under Arbitrage
**Authors:** Aldridge, Krawciw  
**File:** `optimal_trading_arbitrage.pdf`

### Key Insights (TODO)
- Market microstructure considerations
- Execution optimization
- HFT vs medium-frequency trade-offs

---

## 4. Risk Management for Trading Strategies
**Author:** Ernest Chan (QuantConnect)  
**File:** `risk_management_guide.html`

### Key Insights
- Kelly Criterion for position sizing
- Maximum drawdown limits
- Correlation risk in portfolios
- Stress testing frameworks

### Application:
- Current: 3% daily loss limit
- Enhance: Correlation-adjusted stops
- Add: Worst-case scenario testing

---

## 5. Statistical Arbitrage in High Frequency Trading
**Authors:** Gatev, Goetzmann, Rouwenhorst  
**File:** `stat_arb_hf.pdf`

### Key Insights (TODO)
- Pairs trading methodology
- Cointegration vs correlation
- Mean reversion strategies
- Transaction cost impact

---

## 6. The Volatility Risk Premium
**Authors:** Carr, Wu  
**File:** `volatility_risk_premium.pdf`

### Key Insights (TODO)
- Why VIX is typically higher than realized vol
- Strategies to capture vol premium
- Risk/reward characteristics

### Application:
- Vol selling strategies (Tier 1 income)
- VIX term structure analysis

---

## 7. High Frequency Trading and Market Quality
**Authors:** Hendershott, Riordan  
**File:** `hf_trading_market_quality.pdf`

### Key Insights (TODO)
- Impact of HFT on liquidity
- Bid-ask spread dynamics
- Market maker behavior
- Retail vs institutional flow

---

## Priority Reading Order

1. **#2 AFML Introduction** — Foundation for all ML strategies
2. **#1 10 Reasons Quants Fail** — Avoid common pitfalls
3. **#4 Risk Management** — Immediate application
4. **#6 Volatility Risk Premium** — Tier 1 strategies
5. **#5 Statistical Arbitrage** — Tier 2 strategies
6. **#3 Optimal Trading** — Execution optimization
7. **#7 HFT Market Quality** — Context/background

---

## Next Steps

- [ ] Read and summarize AFML Introduction
- [ ] Build purged CV framework
- [ ] Implement meta-labeling
- [ ] Read Risk Management guide
- [ ] Enhance position sizing with Kelly Criterion

*Updated: July 17, 2026*
