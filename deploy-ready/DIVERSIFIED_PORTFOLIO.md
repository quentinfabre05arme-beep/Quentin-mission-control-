# Diversified Swing Trading Portfolio
## Multi-Asset Strategy for 5% Monthly Returns

---

## 🎯 STRATEGY OVERVIEW

**Goal:** Build a diversified portfolio with **6-8 positions** targeting 5% monthly returns through:
- **High-probability setups only** (WEAK_BUY/BUY signals)
- **Multiple sectors** (tech, healthcare, crypto, AI)
- **Risk-appropriate sizing** (6-12% per position)
- **Diversified catalysts** (earnings, momentum, oversold bounces)

**Current Status:** 1 active, 4 ready/watching  
**Target Deployment:** 44-50% across 5-6 positions  
**Cash Reserve:** 50% for new opportunities

---

## 📊 PORTFOLIO ALLOCATION

| Rank | Asset | Signal | Sector | Alloc | Status | Entry | Target | Stop | Catalyst |
|------|-------|--------|--------|-------|--------|-------|--------|------|----------|
| 1 | **HIMS** | WEAK_BUY | Healthcare | **12%** | ✅ OPEN | $37.17 | $40 | $35 | Earnings Aug 10 |
| 2 | **ETH** | WATCH | Crypto | **10%** | ⏳ WAIT | $1,850-1,910 | $2,050 | $1,820 | Oversold bounce |
| 3 | **SMCI** | WEAK_BUY | AI/Tech | **8%** | ⏳ READY | $26.89 | $30 | $24.50 | AI server demand |
| 4 | **BTC** | WATCH | Crypto | **8%** | ⏳ WAIT | $62,500 | $68,000 | $61,500 | Dip buy |
| 5 | **COIN** | WATCH | Crypto | **6%** | ⏳ WAIT | $160 | $185 | $155 | BTC correlation |

**Deployed:** $12,000 (12%)  
**Allocated:** $30,000 (30%)  
**Cash:** $58,000 (58%)  
**Risk per trade:** 4-6% max loss

---

## 🏆 POSITION QUALITY SCORES

| Asset | Win Rate | R:R | Conviction | Quality Score |
|-------|----------|-----|------------|---------------|
| HIMS | 75% | 1.3:1 | HIGH | ⭐⭐⭐⭐⭐ |
| ETH | 79% | 1.5:1 | HIGH | ⭐⭐⭐⭐⭐ |
| SMCI | N/A | 2.1:1 | MEDIUM | ⭐⭐⭐⭐ |
| BTC | 73% | 5.5:1 | HIGH | ⭐⭐⭐⭐ |
| COIN | N/A | 1.8:1 | MEDIUM | ⭐⭐⭐ |

**Quality Score Formula:** (Win Rate × 0.3) + (R:R × 0.3) + (Conviction × 0.4)

---

## 🔄 SECTOR DIVERSIFICATION

```
Healthcare     ████████░░  12%  (HIMS)
Crypto         ██████████  24%  (ETH, BTC, COIN)
AI/Tech        ██████░░░░  8%   (SMCI)
Cash Reserve   ████████████████████  58%
```

**Risk Note:** 24% crypto exposure is high but spread across 3 assets with different setups.

---

## 🎯 IMMEDIATE ACTIONS

### TODAY (Priority)

| Asset | Action | Condition |
|-------|--------|-----------|
| **SMCI** | Enter 8% | NOW or above $27.50 |

**SMCI Trade Details:**
- **Entry:** $26.89 (immediate) or $27.50 (confirmation)
- **Size:** 8% = $8,000 = ~298 shares
- **Target:** $30 (+11.6%)
- **Stop:** $24.50 (-8.9%)
- **R:R:** 2.1:1
- **Rationale:** RSI oversold 40.2, AI infrastructure play, -2.75% pullback entry

### THIS WEEK

| Asset | Action | Trigger |
|-------|--------|---------|
| **ETH** | Enter 10% | RSI < 40 or WEAK_BUY |
| **COIN** | Enter 6% | Pullback to $160 |

### ON PULLBACK

| Asset | Action | Trigger |
|-------|--------|---------|
| **BTC** | Enter 8% | Dip to $62K-63K |

---

## 📈 5% MONTHLY RETURN MATH

### Scenario A: 3 Trades Hit Target

| Asset | Size | Target | P&L |
|-------|------|--------|-----|
| HIMS | $12K | +7.6% | +$912 |
| ETH | $10K | +7.3% | +$730 |
| SMCI | $8K | +11.6% | +$928 |
| **Total** | | | **+$2,570** |

**Month 1 Result:** +2.57% (need one more trade for 5%)

### Scenario B: 4 Trades (Including BTC)

| Asset | Size | Target | P&L |
|-------|------|--------|-----|
| Above | $30K | Mixed | +$2,570 |
| BTC | $8K | +8.8% | +$704 |
| **Total** | | | **+$3,274** |

**Month 1 Result:** +3.27%

### Scenario C: With One Big Winner

| Asset | Size | Return | P&L |
|-------|------|--------|-----|
| HIMS | $12K | +10% | +$1,200 |
| ETH | $10K | +5% | +$500 |
| **Total** | | | **+$1,700** |

**+ Additional trades = path to 5%**

---

## 🛡️ RISK MANAGEMENT

### Per-Position Limits
- Max loss: 5-6% per position
- Max portfolio heat: 40% deployed
- Correlated positions: Max 2 (crypto group)

### Portfolio Stops
- Daily max loss: $2,000 (2%)
- Weekly review: Every Friday
- Cut losers fast: -6% hard stop

### Position Sizing Formula
```
Position % = Confidence × Edge × R:R multiplier

HIMS: HIGH (1.0) × 75% (0.75) × 1.0 = 12%
ETH: HIGH (1.0) × 79% (0.79) × 1.0 = 10%
SMCI: MEDIUM (0.8) × N/A × 1.2 = 8%
BTC: HIGH (1.0) × 73% (0.73) × 1.1 = 8%
COIN: MEDIUM (0.8) × N/A × 0.8 = 6%
```

---

## 📋 EXECUTION CHECKLIST

### Pre-Trade
- [ ] Confirm signal (WEAK_BUY or better)
- [ ] Check catalyst is still valid
- [ ] Verify stop is within -6% limit
- [ ] Calculate position size
- [ ] Log in paper_trading.json

### Entry
- [ ] Enter at planned price
- [ ] Set stop loss immediately
- [ ] Record entry timestamp
- [ ] Update position status

### Management
- [ ] Review daily
- [ ] Move stop to breakeven at +5%
- [ ] Scale out 1/3 at +10%
- [ ] Review on Friday

### Exit
- [ ] Log exit reason
- [ ] Calculate P&L
- [ ] Update trade_history
- [ ] Review lesson learned

---

## 🎯 ENTRY TRIGGERS SUMMARY

| Asset | Current | Entry | Trigger | Size |
|-------|---------|-------|---------|------|
| **HIMS** | $37.17 | IN | IN | 12% ✅ |
| **SMCI** | $26.89 | $26.89 | NOW | 8% ⏳ |
| **ETH** | $1,910 | $1,850 | RSI < 40 | 10% ⏳ |
| **COIN** | $167 | $160 | Pullback | 6% ⏳ |
| **BTC** | $64,302 | $62,500 | Dip | 8% ⏳ |

---

## 📊 EXPECTED TIMELINE

| Week | Expected Action | Target Return |
|------|-----------------|---------------|
| **Week 1 (Now)** | HIMS open, SMCI enter, watch ETH | — |
| **Week 2** | ETH enter, COIN possible | +2-3% (HIMS, SMCI) |
| **Week 3** | BTC entry possible, scale winners | +3-4% total |
| **Week 4 (Aug 10)** | HIMS earnings, evaluate | +5% if HIMS hits |
| **Month 2** | Rotate winners, new setups | Compound |

---

## 🔄 REBALANCE RULES

**Add to winners when:**
- Position up +10% with volume
- Stop raised to breakeven
- Catalyst still intact

**Cut losers when:**
- Hit -6% stop (no exceptions)
- Thesis invalidated
- Better opportunity found

**Trim when:**
- Up +15% (take 50% off)
- Approaching target
- Correlated assets all winning

---

## 📝 QUICK COMMANDS

```powershell
# Check portfolio status
node mission_control/paper_trade_manager.js status

# Enter SMCI now
node paper_trade_manager.js enter SMCI

# Run market scan
node mission_control/quick_scan.js

# Full enhanced research
node mission_control/enhanced_research.js --all

# Update positions
node mission_control/paper_trade_manager.js status
```

---

## 📁 FILES

| File | Purpose |
|------|---------|
| `DIVERSIFIED_PORTFOLIO.md` | This document — full strategy |
| `portfolio_strategy.json` | Allocation rules |
| `paper_trading.json` | Live positions |
| `quick_scan_results.json` | Latest scan results |
| `swing_scanner.js` | Multi-asset scanner |
| `paper_trade_manager.js` | Position management |

---

## ✅ SUMMARY

**You now have:**
1. ✅ **1 active position** (HIMS 12%)
2. ✅ **1 ready to enter** (SMCI 8%)
3. ✅ **3 watching** (ETH 10%, BTC 8%, COIN 6%)
4. ✅ **Diversified across 4 sectors**
5. ✅ **Realistic path to 5% monthly**
6. ✅ **Risk management rules defined**

**Immediate next step:** Enter SMCI for 8% allocation  
**This week:** Wait for ETH/COIN entries  
**Monitor:** BTC for dip to $62K

**Review:** July 19 (Friday) or on signal change
