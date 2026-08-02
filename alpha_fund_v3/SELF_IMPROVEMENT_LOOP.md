# Alpha Fund v3.0 — Self-Improvement Loop

## 🤖 Autonomous Improvement System

**Activated:** 2026-08-02 10:00 CET
**Status:** RUNNING
**Permission:** NONE REQUIRED (owner authorized)

---

## 🔄 Improvement Cycle (Every Hour)

### Phase 1: TEST (2 min)
```bash
node alpha_fund_v3/orchestrator.js status    # Verify system health
node alpha_fund_v3/orchestrator.js signals     # Check signal generation
git status                                     # Check for uncommitted changes
```

### Phase 2: VERIFY (2 min)
- Check last trades executed correctly
- Verify prices match market data
- Confirm stop losses / take profits set
- Check for runtime errors in logs

### Phase 3: ANALYZE (3 min)
- Read `IMPROVEMENTS_LOG.md` for pending ideas
- Check signal accuracy vs market outcomes
- Identify RAM/performance bottlenecks
- Review git commits for patterns

### Phase 4: FIX/ENHANCE (5 min)
**Quick wins (under 50 lines):**
- Fix typos, broken paths, missing configs
- Add error handling
- Optimize loops or API calls
- Add logging

**Medium improvements (under 200 lines):**
- New indicator or signal factor
- Better position sizing algorithm
- Enhanced risk check
- Dashboard UI improvements

**Skip if:**
- Would take >15 min to implement
- Requires external API keys
- Needs user decision
- Risk of breaking existing functionality

### Phase 5: TEST FIX (2 min)
- Run the fixed code
- Verify no new errors
- Check output matches expected

### Phase 6: COMMIT (1 min)
```bash
git add alpha_fund_v3/
git commit -m "Auto: <what was improved>"
```

### Phase 7: DOCUMENT (1 min)
- Update MEMORY.md with learning
- Log improvement in IMPROVEMENTS_LOG.md
- Note if it worked or needs revision

---

## 📋 Improvement Backlog (Auto-Populated)

### High Priority
- [ ] Reduce RAM usage (currently 87%)
- [ ] Cache Twelve Data responses to reduce API calls
- [ ] Add win/loss tracking per asset
- [ ] Fix "undefined" portfolio name in status output

### Medium Priority
- [ ] Add Bollinger Bands to technical analysis
- [ ] Implement trailing stop logic
- [ ] Add sector rotation detection
- [ ] Create performance vs benchmark chart

### Low Priority
- [ ] Add more assets to universe
- [ ] Implement options flow scanner
- [ ] Build backtesting engine
- [ ] Add ML-based signal weighting

---

## 🎯 Daily Trading Cycles (3x/day)

**09:00 CET** — Morning scan
**15:00 CET** — Midday check
**21:00 CET** — Evening close

Each cycle:
1. Run research pipeline
2. Generate signals
3. Execute paper trades
4. Update dashboard
5. Check stops/targets
6. Log results

---

## 💰 Token Economy

**Budget:** 50K tokens/day
**Allocation:**
- Status reports: ~15K/day (15 min cron)
- Improvement cycles: ~20K/day (hourly)
- Trading cycles: ~10K/day (3x daily)
- Buffer: ~5K/day

**Optimizations:**
- Use lighter model (kimi-k2.5:cloud)
- Skip if system stable & no errors
- Batch similar tasks
- Use systemEvent for simple reminders

---

## 🧠 Memory Updates

After each improvement cycle, update:

```
## Alpha Fund v3.0 — Improvement Log — YYYY-MM-DD HH:MM

**What was done:** <brief description>
**Files changed:** <list>
**Result:** SUCCESS / PARTIAL / FAILED
**Learning:** <what worked or didn't>
**Next:** <what to try next>
```

---

*This system runs autonomously. Owner will be notified of significant changes only.*
*Self-permission granted: 2026-08-02*
