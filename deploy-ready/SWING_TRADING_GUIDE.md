# Swing Trading Paper Portfolio System
## Automated 5% Monthly Target Trading

---

## 🚀 QUICK START

### 1. View Portfolio Status
```bash
cd mission_control
node swing_paper_trader.js
```

### 2. Enter New Position
```bash
node swing_paper_trader.js enter SYM
# Follow prompts: price, shares, stop, catalyst, thesis
```

### 3. Exit Position
```bash
node swing_paper_trader.js exit SYM
# Follow prompts: exit price, reason
```

### 4. Check Statistics
```bash
node swing_paper_trader.js stats
```

---

## 📊 SYSTEM CONFIGURATION

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Starting Balance** | $100,000 | Account starting capital |
| **Monthly Target** | 5% | $5,000 per month goal |
| **Max Position** | 15% | Never exceed 15% in single position |
| **Max Deployed** | 44% | Keep 56% cash reserve minimum |
| **Default Stop** | 6% | Maximum loss per position |
| **Profit Targets** | 5%, 10%, 15% | Scale out levels |

---

## 🎯 POSITION SIZING GUIDE

| Conviction | Score | Position Size | Example |
|------------|-------|---------------|---------|
| ⭐⭐⭐⭐⭐ | 90-100 | 12-15% | Strongest signal |
| ⭐⭐⭐⭐ | 80-89 | 8-12% | High confidence |
| ⭐⭐⭐ | 70-79 | 6-8% | Moderate |
| ⭐⭐ | 60-69 | 4-6% | Weak/setup |
| ❌ | <60 | 0% | Avoid |

---

## 📋 ENTRY CHECKLIST

Before entering ANY position:

- [ ] Run master checklist: `node master_checklist.js SYM`
- [ ] Score >= 70 (⭐⭐⭐ or better)
- [ ] Position size within limits (6-15%)
- [ ] Stop loss defined (6% max)
- [ ] Catalyst identified and dated
- [ ] Thesis written (2-3 sentences)
- [ ] Entry price confirmed
- [ ] Cash available

---

## 🚨 EXIT RULES

### Automatic (System Monitors)
| Trigger | Action | Reason |
|---------|--------|--------|
| Price hits stop loss | EXIT 100% | Risk management |
| Price hits 5% target | SCALE OUT 33% | Take partial profits |
| Price hits 10% target | SCALE OUT 33% more | Lock in gains |
| Price hits 15% target | SCALE OUT remainder | Full profit |
| Hold >30 days, losing | REVIEW | Time stop |

### Manual (Your Discretion)
- Thesis invalidated
- Better opportunity
- Portfolio rebalancing
- Catalyst passed without move

---

## 🤖 AUTOMATED MONITORING

### What's Automated
- ✅ Price checks every 30 minutes (market hours)
- ✅ Stop loss alerts
- ✅ Profit target alerts
- ✅ Daily P&L summary
- ✅ Large move notifications (>5%)
- ✅ Time-based reviews (>30 days)

### When Alerts Fire
| Alert Type | Action Required |
|------------|----------------|
| 🚨 STOP LOSS | Exit immediately |
| 🎯 PROFIT TARGET | Scale out |
| ⏰ TIME STOP | Review position |
| 📈 LARGE MOVE | Check thesis |

---

## 📁 FILES

| File | Purpose |
|------|---------|
| `swing_paper_trader.js` | Main trading interface |
| `swing_monitor.js` | Automated monitoring |
| `swing_portfolio.json` | Live portfolio data |
| `swing_history.json` | Closed trade history |
| `swing_alerts.json` | Active alerts log |
| `logs/swing_monitor.log` | Detailed logs |

---

## 📈 PERFORMANCE TRACKING

### Key Metrics
- **Win Rate** - Target: 65%+
- **Profit Factor** - Target: >2.0
- **Avg Holding Period** - Target: 5-15 days
- **Max Drawdown** - Limit: <15%
- **Monthly Return** - Target: 5%

### View Stats
```bash
node swing_paper_trader.js stats
```

Shows:
- Total trades
- Win rate
- Average win/loss
- Profit factor
- Best/worst trades
- Performance by symbol

---

## ⚠️ RISK MANAGEMENT

### Position Rules
1. Never exceed 15% single position
2. Never exceed 44% total deployed
3. Always have stop loss (6% max)
4. Scale out at profit targets
5. Cut losers quickly, let winners run

### Portfolio Rules
1. Max 6-8 positions (manageable)
2. Diversify across sectors
3. Correlation check: No >0.7 correlation
4. Cash reserve: 56% minimum

### Behavioral Rules
1. Pre-commit to stops
2. Document thesis before entry
3. Review closed trades weekly
4. No revenge trading
5. No FOMO entries

---

## 🔄 WORKFLOW

### Morning (9:30 AM ET)
1. Check overnight alerts
2. Review portfolio status
3. Check market research signals
4. Plan any new entries

### During Market (9:30 AM - 4:00 PM ET)
- Monitor runs automatically every 30 min
- Alerts sent on stop/target hits
- Manual checks for scale-outs

### Evening (After 4:00 PM ET)
1. Review daily P&L
2. Update thesis if needed
3. Plan next day
4. Check research for new ideas

---

## 💡 TIPS

### Best Practices
- **Wait for setup** - Don't force trades
- **Size by conviction** - Higher score = bigger position
- **Document everything** - Thesis, stops, targets
- **Review losers** - Learn from mistakes
- **Stay patient** - 5% monthly is 79% annualized

### Common Mistakes
- Entering without checklist
- Oversizing on FOMO
- Moving stops to avoid loss
- Taking profits too early
- Holding losers too long

---

## 🎯 EXAMPLE WORKFLOW

### HIMS Entry (July 16)
```bash
# Step 1: Checklist
node master_checklist.js HIMS
# Result: 100/100 ⭐⭐⭐⭐⭐ Conviction Buy

# Step 2: Enter position
node swing_paper_trader.js enter HIMS
# Entry: $37.17
# Shares: 269
# Stop: $35.00
# Catalyst: Q2 Earnings Aug 10
# Thesis: GLP-1 leader with accelerating revenue

# Step 3: Monitor
# System checks every 30 min
# Alerts on stop ($35) or targets ($39, $41, $43)
```

---

## 📱 MOBILE ACCESS

Access from phone via SSH or remote desktop to:
```
C:\Users\quent\.openclaw\workspace\mission_control\
```

Or check logs remotely:
```bash
tail -f swing_alerts.json
```

---

## 🆘 TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Prices not updating | Check API keys in TOOLS.md |
| Alerts not firing | Check swing_alerts.json timestamp |
| Can't enter position | Check balance and position limits |
| Log errors | Check logs/swing_monitor.log |

---

## 📊 EXPECTED PERFORMANCE

### Conservative Scenario
- Win Rate: 65%
- Avg Win: +8%
- Avg Loss: -4%
- Monthly Return: 4-6%

### Target Scenario
- Win Rate: 70%
- Avg Win: +10%
- Avg Loss: -5%
- Monthly Return: 5-7%

### Annualized
- Conservative: ~50%
- Target: ~79%
- Aggressive: ~100% (higher risk)

---

**Status:** System operational as of July 16, 2026 10:30 CET
**Next Review:** Daily at market close
**Contact:** Check swing_alerts.json for alerts
