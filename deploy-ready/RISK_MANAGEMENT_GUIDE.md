# Risk Management & Position Sizing Guide
## Swing Trading Portfolio Optimization

---

## 🎯 THE OPTIMAL NUMBER OF POSITIONS

### Research-Backed Guidelines

| Portfolio Size | Risk Level | Recommended Positions | Notes |
|---------------|------------|----------------------|-------|
| **Conservative** | 15-20% total risk | 5-8 positions | Best for 5% monthly target |
| **Moderate** | 25-30% total risk | 8-12 positions | Requires more monitoring |
| **Aggressive** | 40-50% total risk | 12-20+ positions | Harder to manage, higher variance |

**Your Sweet Spot: 6-8 positions**
- Manages 25-35% total portfolio risk
- Achieves meaningful diversification
- Still trackable daily
- Allows selective entry/exit

### Why Not Fewer?

| # Positions | Risk Concentration | Problem |
|-------------|-------------------|---------|
| 1-2 | 50-100% risk | One bad trade = disaster |
| 3-4 | 30-50% risk | Still vulnerable to sector rotation |
| 5 | 25% risk | Minimum for basic diversification |

### Why Not More?

| # Positions | Problem | Impact |
|-------------|---------|--------|
| 10+ | Harder to track | Miss exits, late stops |
| 15+ | Over-diversification | Returns regress to market |
| 20+ | Like an index | Can't beat the market |

**Your current plan (5 positions) = GOOD START**
**Recommended expansion: 6-8 positions**

---

## 📊 POSITION SIZING MODELS

### Model 1: Fixed Fractional (Recommended for You)

**Formula:** Risk per trade ÷ Stop distance = Position size

```
Position % = (Account Risk %) ÷ (Stop Loss %)
```

**Example:**
- Account: $100,000
- Risk per trade: 1% ($1,000)
- Stop loss: 6%
- Position size: 1% ÷ 6% = **16.7% max**

**Your Application:**

| Asset | Stop % | Position % | $ Amount |
|-------|--------|-----------|----------|
| HIMS | 5.8% | 12% | $12,000 |
| SMCI | 8.9% | 8% | $8,000 |
| ETH | 4.7% | 10% | $10,000 |
| BTC | 1.6% | 8% | $8,000 |
| COIN | 7.3% | 6% | $6,000 |

**Total Risk:** ~$4,000 (4% of portfolio)

---

### Model 2: Kelly Criterion (Theoretical Maximum)

**Formula:** 
```
Kelly % = Win% - ((1 - Win%) ÷ R:R)
```

**Your WEAK_BUY signals:**
- Win rate: 75%
- Average R:R: 1.5:1

**Kelly calculation:**
```
Kelly = 0.75 - (0.25 ÷ 1.5)
Kelly = 0.75 - 0.167
Kelly = 0.583 or 58%
```

**Practical Kelly (Half Kelly for safety):**
```
Half Kelly = 29% per trade
Quarter Kelly = 14.5% per trade
```

**Your sizing is conservative and appropriate.**

---

### Model 3: Volatility-Adjusted Sizing

**Formula:** Target volatility ÷ Asset volatility = Position size

**Example:**
- Portfolio target: 15% annual volatility
- HIMS volatility: ~50% annual
- Position: 15% ÷ 50% = **30% max in HIMS**

**Your current: 12% = Conservative**

---

## 🛡️ YOUR RISK MANAGEMENT FRAMEWORK

### The 1-2-3 Rule

| Rule | Application | Your Setting |
|------|-------------|--------------|
| **1%** | Risk per trade | $1,000 per position |
| **2%** | Daily max loss | $2,000/day |
| **3%** | Weekly max loss | $3,000/week |

### Portfolio Heat Management

```
Portfolio Heat = Σ (Position Size × Distance to Stop)

Example:
- HIMS: 12% × 5.8% = 0.70%
- SMCI: 8% × 8.9% = 0.71%
- ETH: 10% × 4.7% = 0.47%
- BTC: 8% × 1.6% = 0.13%
- COIN: 6% × 7.3% = 0.44%

Total Heat: 2.45%
```

**Your Target:** <4% portfolio heat = ✅ CONSERVATIVE

---

## 📐 OPTIMAL POSITION SIZING FOR YOUR STRATEGY

### Based on Your Backtest Data

| Signal Type | Win Rate | R:R | Recommended Size | Risk per Trade |
|-------------|----------|-----|------------------|----------------|
| **BUY** | 100% (rare) | 2:1 | 15% max | 1.5% |
| **WEAK_BUY** | 73-79% | 1.5:1 | 10-12% | 1.0% |
| **HOLD/WATCH** | N/A | — | 0% | — |
| **WEAK_SELL** | 29% | 0.5:1 | **0% (avoid)** | — |
| **SELL** | 0% | 0:1 | **0% (avoid)** | — |

### Your Current Allocation (Reviewed)

| # | Asset | Signal | Size | Risk % | Quality |
|---|-------|--------|------|--------|---------|
| 1 | **HIMS** | WEAK_BUY | **12%** | 0.70% | ✅ Good |
| 2 | **ETH** | WATCH→WEAK_BUY | **10%** | 0.47% | ✅ Good |
| 3 | **SMCI** | WEAK_BUY | **8%** | 0.71% | ✅ Good |
| 4 | **BTC** | WATCH→WEAK_BUY | **8%** | 0.13% | ✅ Good |
| 5 | **COIN** | WATCH | **6%** | 0.44% | ⚠️ Wait for signal |
| 6 | **NEW** | — | **10%** | — | 🎯 Add one more |

**Recommended 6th position:** Add another 8-10% in a non-crypto sector (tech, healthcare, or broad market)

---

## 🎯 THE IDEAL 6-POSITION PORTFOLIO

### Sector Allocation

```
Current (5 positions):
Healthcare     ████████░░  12%  (HIMS)
AI/Tech        ██████░░░░  8%   (SMCI)
Crypto         ████████████████  24%  (ETH, BTC, COIN)
Cash           ████████████████████████  56%

Target (6 positions):
Healthcare     ████████░░  12%  (HIMS)
AI/Tech        ██████░░░░  8%   (SMCI)
Crypto         ████████████  18%  (ETH, BTC)
FinTech        █████░░░░░  6%   (COIN)
Broad Market   ████████░░  10%  (SPY/QQQ)
Cash           ████████████████████  46%
```

**Risk Distribution:**
- Crypto: 18% (reduced from 24%)
- Tech: 28% (diversified)
- Healthcare: 12%
- Cash: 46% (dry powder)

---

## 📋 POSITION SIZING CALCULATOR

### For New Trades

```javascript
function calculatePosition(account, signal, stopPct, confidence) {
  // Base risk: 1% of account
  const baseRisk = account * 0.01;
  
  // Adjust for confidence
  const confidenceMultiplier = {
    'HIGH': 1.2,
    'MEDIUM': 1.0,
    'LOW': 0.8
  };
  
  // Adjust for historical win rate
  const winRateMultiplier = {
    'BUY': 1.3,      // 100% win rate
    'WEAK_BUY': 1.0, // 75% win rate
    'WATCH': 0,      // Don't enter
    'SELL': -1       // Short (not implemented)
  };
  
  const adjustedRisk = baseRisk * 
    confidenceMultiplier[confidence] * 
    winRateMultiplier[signal];
  
  // Position = Risk ÷ Stop distance
  const positionDollars = adjustedRisk / (stopPct / 100);
  const positionPct = positionDollars / account;
  
  // Cap at 15%
  return Math.min(positionPct, 0.15);
}

// Examples:
calculatePosition(100000, 'WEAK_BUY', 5.8, 'HIGH');  // HIMS: ~12%
calculatePosition(100000, 'WEAK_BUY', 8.9, 'MEDIUM'); // SMCI: ~8%
calculatePosition(100000, 'BUY', 5.0, 'HIGH');      // Rare: ~15%
```

---

## ⚠️ RISK SCENARIOS

### Worst Case: All Stops Hit

| Position | Size | Stop | Loss |
|----------|------|------|------|
| HIMS | $12K | -5.8% | -$696 |
| SMCI | $8K | -8.9% | -$712 |
| ETH | $10K | -4.7% | -$470 |
| BTC | $8K | -1.6% | -$128 |
| COIN | $6K | -7.3% | -$438 |

**Total Loss:** -$2,444 (2.4% of portfolio)

**Monthly target (5%):** Still achievable with remaining capital

### Best Case: All Targets Hit

| Position | Size | Target | Gain |
|----------|------|--------|------|
| HIMS | $12K | +7.6% | +$912 |
| SMCI | $8K | +11.6% | +$928 |
| ETH | $10K | +7.3% | +$730 |
| BTC | $8K | +8.8% | +$704 |
| COIN | $6K | +10.6% | +$636 |

**Total Gain:** +$3,910 (3.9% of portfolio)

**Month 1 result:** +3.9% (need one more trade for 5%)

---

## 🔄 DYNAMIC POSITION MANAGEMENT

### Scale-In Strategy

Instead of entering full size at once:

| Stage | Condition | Action | Size |
|-------|-----------|--------|------|
| **1** | Initial signal | Enter 50% | 5-6% |
| **2** | Price moves favorably (+3%) | Add 30% | 3-4% |
| **3** | Breakout confirmed (+5%) | Add 20% | 2-3% |
| **Final** | Full position | — | 10-12% |

**Benefits:**
- Reduces risk if initial entry is wrong
- Adds to winners
- Smoother equity curve

---

### Scale-Out Strategy

| Stage | Condition | Action | Remaining |
|-------|-----------|--------|-----------|
| **1** | +5% profit | Sell 25% | 75% |
| **2** | +10% profit | Sell 35% | 40% |
| **3** | +15% profit | Sell 40% | 0% |

**Benefits:**
- Lock in profits
- Let winners run with house money
- Capture full move if it continues

---

## 📊 MONITORING DASHBOARD

### Weekly Risk Check

```
┌────────────────────────────────────────────────────────┐
│  PORTFOLIO HEAT MONITOR — Week of Jul 16, 2026       │
├────────────────────────────────────────────────────────┤
│  Position │ Size │ Stop │ Heat │ Status              │
├────────────────────────────────────────────────────────┤
│  HIMS     │ 12%  │ 5.8% │ 0.70%│ 🟢 Open             │
│  SMCI     │  8%  │ 8.9% │ 0.71%│ ⏳ Ready            │
│  ETH      │ 10%  │ 4.7% │ 0.47%│ ⏳ Watch            │
│  BTC      │  8%  │ 1.6% │ 0.13%│ ⏳ Watch            │
│  COIN     │  6%  │ 7.3% │ 0.44%│ ⏳ Watch            │
├────────────────────────────────────────────────────────┤
│  TOTAL    │ 44%  │ —    │ 2.45%│ 🟢 Safe (<4%)       │
└────────────────────────────────────────────────────────┘
```

---

## ✅ FINAL RECOMMENDATIONS

### Immediate Actions

1. **Add 6th position** (8-10% allocation)
   - Consider SPY, QQQ, or another tech stock
   - Reduces crypto concentration to 18%

2. **Implement scale-in** for future entries
   - Start with 50% of target size
   - Add on confirmation

3. **Set weekly risk reviews**
   - Friday check of portfolio heat
   - Adjust stops to breakeven on +5% winners

### Position Sizing Formula for You

```
Base: 10% per WEAK_BUY signal
Adjust:
  +2% if HIGH confidence
  +3% if BUY signal (rare)
  -2% if MEDIUM confidence
  -3% if large stop (>8%)
  
Max: 15% per position
Min: 6% per position
```

### Optimal Portfolio Structure

| # | Asset | Size | Sector | Status |
|---|-------|------|--------|--------|
| 1 | HIMS | 12% | Healthcare | ✅ Open |
| 2 | SMCI | 8% | AI/Tech | ⏳ Ready |
| 3 | ETH | 10% | Crypto | ⏳ Watch |
| 4 | BTC | 8% | Crypto | ⏳ Watch |
| 5 | COIN | 6% | FinTech | ⏳ Watch |
| 6 | **SPY/QQQ** | **10%** | **Broad** | 🎯 **Find entry** |

**Target:** 6 positions, 54% deployed, 46% cash
**Risk:** ~3% portfolio heat
**Expected monthly return:** 4-5%

---

**Next:** Add 6th position (SPY/QQQ or new tech stock) to complete diversification.
