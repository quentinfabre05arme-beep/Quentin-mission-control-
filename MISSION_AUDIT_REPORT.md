

---

## Product Launch Appendix — 2026-08-03 11:08 CET

Following the deep web research on OpenClaw capabilities and business models, the following revenue products and services were built and added to the workspace.

### 1. Token & Cost Monitor v1.0
- **File:** `missions/token_monitor.js`
- **Purpose:** Track daily token burn and estimated spend by model/task. Prevents the "surprise $3,600 API bill" scenario identified in the research.
- **Schedule:** Hourly via `missions/token_monitor_task.xml` / `OpenClaw-Token-Monitor`
- **Budget:** 65,000 tokens/day (aligned with MEMORY.md)
- **Output:** `project_claw_core/data/token_usage.json`, `project_claw_core/data/token_usage_latest.json`

### 2. Claw Market Brief Newsletter
- **Landing page:** `project_claw_core/dashboard/newsletter.html`
- **Tiers:** Free weekly digest, $9/mo daily brief, $29/mo operator
- **Delivery:** Gmail OAuth already wired into `missions/unified_finance_manager.js`
- **Sample:** Loads latest issue from `content_pipeline/newsletter/output/newsletter_2026-08-03.md`
- **Status:** Ready for Stripe integration; subscriber intent captured in localStorage until backend is wired.

### 3. Done-For-You Agent Setup Service
- **Landing page:** `project_claw_core/dashboard/dfy-setup.html`
- **Packages:**
  - Starter Agent — €499 one-time
  - Pro Operator — €1,299 one-time
  - Enterprise Crew — €2,999+ custom
- **Monthly care:** €149–€499/month
- **Process:** Discovery → Architecture → Install & Harden → Train & Launch

### 4. ClawHub Skill: `claw-market-data-snapshot`
- **Directory:** `skills/claw-market-data-snapshot/`
- **Contents:**
  - `SKILL.md` — skill manifest
  - `README.md` — full documentation
  - `market_data_service.js` — class wrapper
  - `package.json`
  - `examples/basic.js`
- **Value prop:** Free, multi-source market data with cascading fallbacks. First candidate for ClawHub publication.

### 5. Dashboard Integration
- `project_claw_core/dashboard/index.html` now links to newsletter, DFY setup and token usage.
- Token usage card shows today / budget / percentage with color-coded badge.

### Manual Steps Remaining
1. Restart resident processes so new improvements load:
   ```powershell
   $tasks = @('OpenClaw-Always-On-Daemon','OpenClaw-Unified-Master','OpenClaw-ABOS','OpenClaw-Autonomous-Improvement')
   foreach ($t in $tasks) { schtasks /end /tn $t; Start-Sleep -Seconds 2; schtasks /run /tn $t }
   ```
2. Install token monitor scheduled task:
   ```powershell
   schtasks /create /tn OpenClaw-Token-Monitor /xml "C:\Users\quent\.openclaw\workspace\missions\token_monitor_task.xml" /f
   ```
3. Run token monitor once to initialize `token_usage_latest.json`:
   ```powershell
   node missions/token_monitor.js --json | Out-File project_claw_core/data/token_usage_latest.json
   ```
4. Commit and push the new files.

### Files Added/Modified
- Added: `missions/token_monitor.js`, `missions/run_token_monitor.ps1`, `missions/token_monitor_task.xml`, `scripts/restart_resident_processes.ps1`
- Added: `project_claw_core/dashboard/newsletter.html`, `project_claw_core/dashboard/dfy-setup.html`
- Added: `skills/claw-market-data-snapshot/` (full skill package)
- Modified: `project_claw_core/dashboard/index.html`
- Improved: `capability_verification_runner.js` v4.0 + `capability_verify_one.js` (isolated child-process verification)
