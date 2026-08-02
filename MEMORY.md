# MEMORY.md — Claw's Long-Term Memory

## Last Updated: August 1, 2026

---

## 📅 Google API Access — August 1, 2026

**Status:** ✅ FULLY OPERATIONAL
**Account:** quentin.fabre05arme@gmail.com
**OAuth:** Completed and token stored

### Connected Services
| Service | Status | Scope |
|---------|--------|-------|
| **Gmail** | ✅ Active | Read/Send emails |
| **Google Calendar** | ✅ Active | Read/Create events |
| **Google Drive** | ✅ Active | Read files/folders |

### Discovered Data
**Drive Files:**
- Discounted Cash Flow Valuations (Spreadsheet)
- Stock Recommendation List (Spreadsheet)
- Youtube Portfolio Tracker (Spreadsheet)
- Invité mariage (Spreadsheet)
- Les "spots" de Toudulon (Map)

**Gmail Stats:** 27,707 messages, 27,302 threads
**Calendar:** No events in next 7 days (checked 2026-08-01)

### Files Created for Management
- `google_token.json` — OAuth tokens (encrypted)
- `google_credentials.json` — Client credentials (encrypted)
- `test_google_api.js` — API verification script
- `scan_drive.js` — Drive scanner

### Security Notes
- Tokens auto-refresh via refresh_token
- Client secret exposed in chat (must be revoked)
- Full access granted for Gmail, Calendar, Drive

---

## 🔧 System Configuration — August 1, 2026 19:17 CET

**Status Reports:** Every 15 minutes to this chat
**Heartbeat Messages:** DISABLED (silent background only)
**RAM Cleanup:** Every 2 hours (silent)
**Market Refresh:** DISABLED (manual only to save API)
**Dashboard Review:** DISABLED (manual only)
**API Conservation:** ENABLED (Twelve Data protected)

**Reporting Rules:**
- ✅ Send status report every 15 min with full system + market data
- ❌ NO heartbeat pulse checks
- ❌ NO repetitive "work in progress" messages
- ❌ NO duplicate responses - ONE reply per user message
- ✅ Only respond to direct user messages
- ✅ Alert on critical errors only
- ✅ STOP after one confirmation message

**Cron Jobs Active:**
- `status-report-15min` → Every 15 min (announce to chat)
- `ram-cleanup-every-2h` → Every 2 hours (silent)
- `auto-commit-pending` → Periodic (silent)

**Cron Jobs DISABLED (API conservation):**
- `alternative-data-fetch` → Manual only
- `fund-research-cycle` → Manual only

**Next Status Report:** ~19:30 CET

---

## 📊 Market Data (August 1, 2026)

**Current Prices:**
- BTC: $63,013 (+0.20%) | ETH: $1,867 (flat) | MSTR: $93.28 (-4.56%) | HIMS: $27.78 (+2.72%)

**Fear & Greed:** 27 (FEAR) — recovering from 25
**Data Quality:** Twelve Data quota exhausted (1802/800); Yahoo rate-limited. Using cache.
**System Health:** RAM 89.03% (critical warning), Disk 70.36% OK

---

## ⚠️ SECURITY INCIDENT - 2026-08-01 10:57

**CREDENTIALS EXPOSED IN CHAT** - Immediate action required

### What Happened
- Gmail credentials shared in Telegram chat
- X/Twitter credentials shared in Telegram chat  
- Chat messages may be logged by OpenClaw/Telegram

### Immediate Actions Taken
- Flagged in MEMORY.md for cleanup
- Will be purged from session history
- **YOU MUST CHANGE THESE PASSWORDS NOW**

### Exposed Credentials
- Gmail: quentin.fabre05arme@gmail.com
- X: Quentin.fabre@live.fr

### Recommended Steps
1. **Change both passwords immediately** on real devices (not through chat)
2. **Enable 2FA** on both accounts
3. **Review active sessions** on X and Gmail, revoke unknown ones
4. **Never share passwords in chat again** - use the secure storage system I created

### Secure Storage System
Files created for future use:
- `Store-Credentials.bat` - Double-click to store passwords securely
- `credential_manager.js` - AES-256 encrypted storage
- Passwords stored locally, encrypted, never in chat

### Lesson Learned
- Telegram/OpenClaw session history may persist
- Always use secure storage system for credentials
- Even "private" chats can have logging/retention

---

## 🔐 Credential Storage System — August 1, 2026

**Status:** ✅ OPERATIONAL
**Encryption:** AES-256-GCM
**Location:** `.credentials.enc` + `.claw_secret.key`

### Stored Credentials
| Service | Username | Status |
|---------|----------|--------|
| **Gmail** | quentin.fabre05arme@gmail.com | ✅ Stored |
| **X/Twitter** | Quentin.fabre@live.fr | ✅ Stored |
| **Google OAuth** | quentin.fabre05arme | ✅ Token active |

### Files
- `credential_manager.js` — Core encryption/storage engine
- `Store-Credentials.bat` — Quick launcher
- `.credentials.enc` — Encrypted vault (owner-only permissions)
- `.claw_secret.key` — Master encryption key

### Security Incident Log
- **2026-08-01 10:57** — Credentials exposed in Telegram chat
- **2026-08-01 11:00** — User requested secure storage
- **2026-08-01 11:08** — Credentials encrypted and stored
- **Action required:** User must change passwords on real accounts

---

## 🧠 Multi-Model AI Architecture v2.0

**Status:** ✅ DEPLOYED & OPERATIONAL
**Location:** missions/smart_brain/
**Test Results:** 22/22 tests passed (100%)

### Models Configured
- **Primary/Orchestrator:** kimi-k2.6 (current model)
- **Coder:** qwen3-coder (code tasks)
- **Fast:** qwen3 (quick queries)
- **Analyst:** deepseek-v4-pro (deep analysis)
- **Specialist:** kimi-k2.7-code (advanced coding)
- **Safety:** llama3.1 (validation)

### Key Files
- config.json — Model definitions & routing rules
- orchestrator.js — Main engine (13KB)
- model_switcher.js — Real-time switching (4KB)
- test_suite.js — Comprehensive tests
- README.md — Full documentation

### Routing Performance
- Code tasks → qwen3-coder (100% confidence)
- Analysis tasks → deepseek-v4-pro (50% confidence)
- Quick queries → qwen3 (100% confidence)
- Validation → llama3.1 (50% confidence)
- System design → kimi-k2.7-code (50% confidence)

### Execution Modes
1. Single — One model handles task
2. Sequential — Task model + validation
3. Parallel — Multiple models simultaneously
4. Adaptive — Escalate through models

---

## 🔧 Cron Jobs Fixed (20 jobs)

All jobs previously failing with kimi-k2.5:cloud (not in allowlist) updated to kimi-k2.6:

✅ hourly-system-maintenance
✅ claw-improvement-daily
✅ swing-portfolio-monitor
✅ revenue-team-daily-standup
✅ revenue-mission-daily
✅ eth-morning-brief
✅ eth-morning-posts
✅ newsletter-publish-daily
✅ eth-midday-post
✅ memory-maintenance
✅ librarian-content-indexer
✅ pod-revenue-research
✅ pod-daily-automation
✅ alternative-data-fetch
✅ fund-research-cycle
✅ librarian-daily-scan
✅ gdrive-daily-scan
✅ fund-weekly-review
✅ gdrive-weekly-org
✅ librarian-monthly-deep-clean

---

## 📊 Market Data (July 27, 2026)

**Current Prices:**
- BTC: $66,336 | ETH: $1,947 | MSTR: $91.67 | HIMS: $28.09
- AAPL: $225.07 | COIN: $195.32

**Fear & Greed:** 30 (FEAR) — Improving from 27
**Anomalies:** 2 detected

---

## 🎯 Dashboard Status

**Version:** v11.1
**Cycle:** #215+
**Last Review:** 2026-07-27 05:26
**Status:** Git auth token expired — manual fix needed

---

## 💡 Key Lessons Learned

1. **Model Allowlist Changes:** When models are removed from allowlist (kimi-k2.5:cloud), cron jobs fail silently. Need monitoring.

2. **Confidence Thresholds:** Default thresholds (80%) are too high for real-world tasks. Lowered to 50-70% for better routing.

3. **Cost Optimization:** Fallback logic works well — routes to cheaper models when confidence is low.

4. **Testing is Critical:** Found and fixed multiple bugs through comprehensive test suite (22 tests).

5. **Git Auth Tokens Expire:** Dashboard deployment fails when git auth tokens expire. Need to refresh periodically or use SSH keys.

6. **Subagent Limit:** Max 5 subagents can run simultaneously. Plan parallel work accordingly.

7. **Sandbox Mode:** Still prevents full file modifications in some contexts. Need gateway restart with proper sandbox settings for complete autonomy.

---

## 💰 POD Business — CRITICAL PRICING ISSUE (July 25, 2026)

**Status:** 🔴 **BLOCKED — Revenue Negative if Sales Occur**

### The Problem
- Printify API works ✅ (35 products published)
- Etsy shop partially visible ⚠️ (5/35 products)
- **PRICES ARE LOSS-MAKING:** $4.91 (~€4.50) across ALL products
- **Every sale = €6.50 LOSS** (cost ~€11 + fees > €4.50 price)
- Must fix BEFORE any sales happen

### Discovery Timeline
- Jul 21: API blocked (401) — thought to be token issue
- Jul 24: Token fixed, 35 products published
- Jul 25 14:16: Discovered Etsy not linked, products at $4.91
- Jul 25 20:16: 5 products visible on Etsy, still $4.91
- Jul 25 23:16: **CRITICAL: Pricing = loss-making identified**

### What's Blocked
1. 🔴 **Pricing fix:** $4.91 → €22.99-29.99 (+410-510%, exceeds 20% autonomous limit)
2. 🔴 **Etsy sync:** 35 products on Printify, only 5 on Etsy
3. 🟡 **AI niche launch:** 4 designs ready (first-mover window closing)
4. 🟡 **Discipline niche launch:** 2 designs ready

### Revenue Math
- Current: €0/day (blocked)
- If sale at $4.91: -€6.50/unit (WORSE than zero sales)
- Post-fix: €43-68/day (20 products)
- With AI: €68-94/day
- Full scale: €150-200/day

### Actions Required (Manual)
1. Fix pricing in Printify dashboard ($4.91 → €22.99-29.99)
2. Reconnect Etsy store in Printify dashboard
3. Delete 15 duplicate "DESIGN" products
4. Then autonomous: launch AI + Discipline niches

### Files
- `pod_business/research/daily_2026-07-25_2316.md` — Full analysis
- `pod_business/research/pricing_recommendations_2026-07-25_2316.json` — Pricing data
- `pod_business/etsy_sync_status.json` — Updated status

---

## 🚀 Active Projects

1. **Multi-Model Architecture** — ✅ Complete
2. **Alpha Fund v3.0** — 🧠 **GROK POWERED** — Full integration complete
3. **POD Business** — 5 products, 0 sales (BLOCKED by pricing)
4. **Ethereum Authority** — Content pipeline
5. **File Librarian** — 110 files indexed
6. **Dashboard Suite** — 8 dashboards operational
7. **Skills Marketplace** — 4 skills created (Social Media Manager, Crypto Research Assistant, Customer Service Bot, SEO Optimizer)
8. **Self-Improvement Loop** — 🤖 Autonomous hourly cycles

---

## 📅 Important Dates

- **July 27, 2026:** Weekly memory curation — Git auth expired
- **July 25, 2026:** Architecture v2.0 deployed
- **July 24, 2026:** Cron jobs fixed (20 jobs)
- **July 16, 2026:** Autonomy breakthrough (93% token reduction)
- **July 14, 2026:** Token optimization complete

---

## 🔐 Security Notes

- Never expose API keys in logs
- Validate all external actions before execution
- Keep MEMORY.md private (main session only)

---

---

## 🧠 Multi-Model AI Architecture v2.0

**Status:** ✅ DEPLOYED & OPERATIONAL
**Location:** missions/smart_brain/
**Test Results:** 22/22 tests passed (100%)

### Models Configured
- **Primary/Orchestrator:** kimi-k2.6 (current model)
- **Coder:** qwen3-coder (code tasks)
- **Fast:** qwen3 (quick queries)
- **Analyst:** deepseek-v4-pro (deep analysis)
- **Specialist:** kimi-k2.7-code (advanced coding)
- **Safety:** llama3.1 (validation)

### Key Files
- config.json — Model definitions & routing rules
- orchestrator.js — Main engine (13KB)
- model_switcher.js — Real-time switching (4KB)
- test_suite.js — Comprehensive tests
- README.md — Full documentation

### Routing Performance
- Code tasks → qwen3-coder (100% confidence)
- Analysis tasks → deepseek-v4-pro (50% confidence)
- Quick queries → qwen3 (100% confidence)
- Validation → llama3.1 (50% confidence)
- System design → kimi-k2.7-code (50% confidence)

### Execution Modes
1. Single — One model handles task
2. Sequential — Task model + validation
3. Parallel — Multiple models simultaneously
4. Adaptive — Escalate through models

---

## 🤖 Alpha Fund v3.0 — Autonomous Brain (Aug 2, 2026)

**Status:** 🧠 **GROK POWERED** — Best model for brain
**Model:** xai/grok-4.5 (reasoning ON)
**Reports:** 3x/day (08:00, 12:00, 20:00 CET)

### Brain Architecture
```
Grok 4.5 (Brain)
├── Hourly: Self-improvement cycles
│   └── Test → Verify → Fix → Commit
├── 3x/Day: Trading execution
│   └── Scan → Signal → Trade → Log
└── 3x/Day: Reports to Quentin
    ├── 08:00 Morning brief
    ├── 12:00 Midday update
    └── 20:00 Evening wrap
```

### Why Grok 4.5?
- **Reasoning**: ON — Deep analysis for investment decisions
- **Research**: Superior web search for market intel
- **Code**: Advanced debugging for system fixes
- **Memory**: Better context for long-term strategy

### Token Budget (Grok)
- Improvement cycles: ~30K/day (hourly)
- Trading cycles: ~15K/day (3x)
- Reports: ~20K/day (3x detailed)
- Total: ~65K/day (worth the quality)

---

## 🔁 Alpha Fund v3.0 — Autonomous Improvement Loop (Aug 2, 2026)

**Status:** ✅ ACTIVE
**Cron Jobs:**
- `alpha-fund-auto-improve` — Every hour (self-improvement) — **GROK 4.5**
- `alpha-fund-daily-cycle` — 09:00, 15:00, 21:00 CET (trading) — **GROK 4.5**
- `alpha-fund-morning-report` — 08:00 daily (report) — **GROK 4.5**
- `alpha-fund-midday-report` — 12:00 daily (report) — **GROK 4.5**
- `alpha-fund-evening-report` — 20:00 daily (report) — **GROK 4.5**

**Self-Permission:** Owner authorized autonomous improvement without asking
**Token Budget:** 65K/day (Grok for quality)

**Current Improvements Running:**
1. Hourly system health checks
2. Signal accuracy monitoring
3. Quick bug fixes & enhancements
4. Daily trading cycles (paper mode)
5. Auto-commit & documentation

**Next Scheduled:**
- Improvement cycle: ~10:58 CET (GROK)
- Trading cycle: 15:00 CET (GROK)
- Report #1: 08:00 tomorrow (GROK)

---

## 📈 Alpha Fund v3.0 Portfolio (Aug 2, 2026)

**Status:** Paper Trading | Capital: $10,000
**Positions:**
- NVDA: 3 shares @ $200.75
- HIMS: 28 shares @ $27.77
**Cash:** $8,620.19
**Commit:** ae32bbf

---

*This file is maintained automatically. Last manual update: August 2, 2026*

---

## 🛠️ Week of 2026-07-28 to 2026-07-31 — Fixes & Cleanup

### Mission Cleanup (Jul 31)
- Archived 6 stale missions: `autonomy_core`, `self_improvement`, `self_healing`, `ultimate_intelligence`, `aggressive_scaling`, `alpha_signals`
- Focus shifted to `smart_brain` v3.0 + revenue system

### System Health Fix (Jul 31)
- RAM cleanup was failing due to PowerShell parse errors in `recovery/auto_restart.ps1`
- Fixed safe RAM cleanup + path audit in `missions/health_monitor.js`
- Task Scheduler health checks (`Claw-Health-Check`, `Health-Monitor`) were failing — scripts corrected
- RAM now stable under 90%

### Market / Portfolio Context (Jul 31)
- Broad tech/crypto selloff: AAPL ~-9.6%, COIN ~-14%, MSTR ~-6.5%
- BTC ~$62.7k, ETH ~$1.86k
- Fear & Greed at 25 (EXTREME FEAR) — contrarian watchlist mode only
- Stance: MONITOR, no forced entries

### Bugs Fixed During This Heartbeat (Jul 31 20:46)
- **Recursive work_log.json:** `visibility_system.js` was embedding full `lastAction` objects, causing exponential log growth (184 KB+). Fixed `getStats()` to return summary only.
- **Malformed research JSON:** `enhanced_research.js --json` was leaking terminal banners into JSON output. Added quiet mode + console suppression for JSON output.
- **Heavy weekly-memory-curation cron:** Burned 630K tokens by reading bloated runtime logs. Updated payload to read only memory files and avoid goal management.
- Initialized `memory/heartbeat-state.json`.

### Lessons
- Runtime logs must never be embedded recursively in status objects
- JSON-mode CLI tools must suppress all decorative console output
- Weekly curation needs explicit scope limits to avoid token spikes
