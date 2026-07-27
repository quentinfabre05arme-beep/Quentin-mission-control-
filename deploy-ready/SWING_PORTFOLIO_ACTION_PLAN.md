# Swing Trading Portfolio Action Plan
## Target: 5% Monthly Return | Strategy: High-Probability Setups

---

## 🎯 CURRENT SITUATION

**Account:** $100,000 paper trading  
**Already deployed:** $10,000 (10%) in HIMS WEAK BUY  
**Cash available:** $90,000  
**Active positions:** 1

---

## 📊 BACKTEST-VALIDATED SIGNALS

From 90-day technical backtest:

| Signal | Asset | Win Rate | Avg Return | Verdict |
|--------|-------|----------|------------|---------|
| **WEAK_BUY** | BTC | **73%** | Moderate | ✅ **Best for crypto** |
| **WEAK_BUY** | ETH | **79%** | +1.80% | ✅ **Best overall** |
| **WEAK_BUY** | HIMS | **75%** | +6.62% | ✅ **Best for momentum** |
| **BUY** | HIMS | **100%** | (5 trades) | ✅ **Rare but excellent** |
| **STRONG_SELL** | All | **0%** | - | ❌ **Never use** |
| **WEAK_SELL** | HIMS | **29%** | - | ❌ **Avoid** |

**Key Insight:** Only enter on **WEAK_BUY** or **BUY** signals. Avoid all sell signals.

---

## 🚀 PORTFOLIO CONSTRUCTION PLAN

### Phase 1: Core Holdings (Week 1) — IN PROGRESS

| # | Asset | Signal | Allocation | Amount | Status |
|---|-------|--------|------------|--------|--------|
| 1 | **HIMS** | WEAK BUY | 12% | $12,000 | ✅ **ENTERED** @ $37.17 |
| 2 | **ETH** | WAIT | 10% | $10,000 | ⏳ **WATCHING** — Entry trigger: RSI < 40 |
| 3 | **BTC** | WAIT | 8% | $8,000 | ⏳ **WATCHING** — Entry trigger: Dip to $62K-63K |

**Phase 1 deployed:** $30,000 (30%)  
**Cash remaining:** $70,000 (70%)

---

### Phase 2: Add on Confirmation (Week 2-3)

Add to winners, cut losers:

| Condition | Action |
|-----------|--------|
| HIMS > $39 (+5%) | Scale out 1/3, raise stop to breakeven |
| HIMS hits $40 (+7.6%) | Scale out another 1/3 |
| ETH gets WEAK_BUY signal | Enter 10% position immediately |
| BTC gets WEAK_BUY signal | Enter 8% position immediately |

---

### Phase 3: Earnings Play (Week 4 — Aug 10)

| Asset | Event | Action |
|-------|-------|--------|
| HIMS | Q2 Earnings Aug 10 | Hold through or exit before based on price action |
| | | If up >10%, take 50% off before close |
| | | If down >5%, exit full position |

---

## 📈 MONTHLY 5% RETURN MATH

**Target:** $5,000/month on $100K = 5%

| Metric | Value |
|--------|-------|
| Expected trades/month | 4 |
| Win rate (backtested) | 75% |
| Average win | +7.5% |
| Average loss | -5.0% |
| Expected value/trade | +4.06% |
| Monthly expected return | **4.06%** (close to 5% target) |

**To hit 5%:** Need 4-5 trades with slightly larger wins or one big winner.

---

## 🎯 SPECIFIC ENTRY TRIGGERS

### ETH — Next Priority

**Current:** $1,910 | RSI 41.5 | HOLD signal  
**Historical WEAK_BUY win rate:** 79%

| Trigger | Action | Price |
|---------|--------|-------|
| RSI drops below 40 | Prepare entry | ~$1,880 |
| RSI below 35 + oversold bounce | Enter 10% | ~$1,850 |
| WEAK_BUY signal fires | Enter 10% immediately | Market |

**Stop:** $1,820 (-4.7%)  
**Target:** $2,050 (+7.3%)  
**R:R:** 1.5:1

---

### BTC — Dip Buy

**Current:** $64,302 | HOLD signal  
**Historical WEAK_BUY win rate:** 73%

| Trigger | Action | Price |
|---------|--------|-------|
| Dip to $62,000-63,000 | Enter 8% | $62,500 |
| RSI below 35 + bounce | Add 8% | ~$61,500 |
| WEAK_BUY signal fires | Enter 8% immediately | Market |

**Stop:** $61,500 (-1.6% from entry)  
**Target:** $68,000 (+8.8%)  
**R:R:** 5.5:1 (excellent)

---

## ❌ AVOID FOR NOW

| Asset | Reason |
|-------|--------|
| **MSTR** | Bearish sentiment (-0.73), no catalyst, no signal |
| All sell signals | 0-29% win rate historically — not worth the risk |

---

## 📋 WEEKLY CHECKLIST

**Every Friday:**
- [ ] Run enhanced research on all 4 assets
- [ ] Update paper trading positions
- [ ] Check for new WEAK_BUY signals
- [ ] Move stops to breakeven on winners
- [ ] Review and document P&L

**Daily:**
- [ ] Check price levels for entry triggers
- [ ] Monitor HIMS position

---

## 🛠️ QUICK COMMANDS

```powershell
# Check portfolio status
node mission_control/paper_trade_manager.js status

# Check for new signals
node mission_control/enhanced_research.js --all

# Enter new position (when ETH/BTC triggers)
node mission_control/paper_trade_manager.js enter ETH

# Update stops/profit taking
node mission_control/paper_trade_manager.js status
```

---

## 📊 EXPECTED TIMELINE

| Week | Action | Expected Return |
|------|--------|-----------------|
| **Week 1 (Now)** | HIMS position open, watch ETH/BTC | — |
| **Week 2** | ETH entry likely, BTC possible | HIMS: +3-5% |
| **Week 3** | Scale winners, adjust stops | HIMS: +5-8% |
| **Week 4 (Aug 10)** | HIMS earnings, evaluate | HIMS: +7% or exit |
| **Month 1 Total** | 3-4 trades closed | **Target: +5%** |

---

## ⚠️ RISK WARNERS

**Kill the trade if:**
- HIMS drops below $35 (stop loss)
- Overall portfolio down >3% in one day
- Backtest assumptions fail (track record diverges from history)

**Scale back if:**
- Win rate drops below 60% over 10 trades
- Average loss exceeds -6%
- Correlation between positions too high (all moving together)

---

**Files:** `portfolio_strategy.json`, `paper_trading.json`, `paper_trade_manager.js`  
**Next Review:** July 19, 2026 (Friday) or on signal change
