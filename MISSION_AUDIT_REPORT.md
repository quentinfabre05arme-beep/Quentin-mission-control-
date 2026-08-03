

---

## Follow-up: Why some missions are NOT running 24/7

The remaining `missions/` folder contains **documents and one-shot scripts**, not resident orchestrators. Only `smart_brain/` has code, but it has no scheduled runner.

### Resident 24/7 systems (the ones that matter)
These live in their own `core/` directories and are kept alive by `scripts/*.ps1` via Task Scheduler:

| System | Location | Script | Loop |
|---|---|---|---|
| Unified Master | `project_claw_core/core/unified_master_orchestrator.js` | `scripts/start_unified_master.ps1` | internal `setInterval` + PS `while($true)` |
| ABOS | `autonomous_business/core/abos_orchestrator.js` | `scripts/start_abos.ps1` | internal `setInterval` + PS `while($true)` |
| Improvement | `autonomous_improvement/core/improvement_orchestrator.js` | `scripts/start_improvement_loop.ps1` | PS `while($true)` sleep 30 min |
| Alpha Daemon | `alpha_fund_v3/core/always_on_daemon.js` | `scripts/start_always_on_daemon.ps1` | internal `setInterval` 60s + PS `while($true)` |

### `missions/` folder — not resident
| Item | Type | 24/7 Status |
|---|---|---|
| `health_monitor.js` | one-shot health check | ❌ Not resident; designed for Task Scheduler single run |
| `portfolio_manager.js` | one-shot portfolio cycle | ❌ Not resident; standalone class |
| `unified_finance_manager.js` | one-shot daily report | ❌ Not resident; standalone class |
| `smart_brain/` | model routing system | ❌ Has code but **no scheduled runner** |
| `health_reports/` | output directory | N/A |
| `Aix_Venue_Finder_Report.md` | finished report | N/A |
| `MISSION_AUDIT_REPORT.md` | audit report | N/A |

### Recommendation
If you want `missions/` to run 24/7, choose one of:
1. **Delete or archive** `portfolio_manager.js`, `unified_finance_manager.js`, `health_monitor.js` if superseded by the core orchestrators.
2. **Convert** `unified_finance_manager.js` into a scheduled daily task (08:00 CET) for the daily market report.
3. **Integrate** `smart_brain/` model routing into the Unified Master orchestrator so it runs on every cycle.
4. **Remove** `✅ Removed

Current active orchestrators already cover market data, alternative data, technical analysis, research, portfolio tracking, risk alerts, daily reports, and autonomous improvement. The `missions/` folder is mostly leftover documentation and standalone scripts.


---

## Follow-up: Content/X Systems Not Running 24/7

After the mission integration pass, several standalone content/X files were also identified as not having scheduled runners and being superseded by the unified content_pipeline/ system and OpenClaw-X-Autonomous-Poster task.

### Cleaned root clutter (archived to rchive_old_tests/)
- 9 loose Python/JS content generators (gentic_content_pipeline_v4.py, generate_daily_content_grok.py, etc.)
- 11 X automation guides/readmes/scripts (X_AUTOMATION_README.md, x_automation_service.ps1, etc.)
- 11 X login debug screenshots
- 38 old mission_control_*.html/md/json dashboard variants
- Mission Control directory, daily_content/, content_output/
- x-api-config/ directory

### What remains active for content/X 24/7
| Component | Runner | Schedule |
|---|---|---|
| Newsletter | content_pipeline/newsletter/run_newsletter.ps1 | AlphaFund-Newsletter-Weekly (ready, next 09/08) |
| X Posts | x_post_scheduler.ps1 → x_post_simple.ps1 | OpenClaw-X-Autonomous-Poster daily 08:00 |
| X Content queue | x_queue.json | Populated by Unified Master research |

### Final content/X file surface
- content_pipeline/newsletter/ — weekly newsletter system
- content_pipeline/x_posts/ — historical post archive
- x_poster.js, x_poster_daemon.js, x_post_browser.js — active browser automation
- x_post_simple.ps1, x_post_scheduler.ps1 — daily posting
- x_queue.json — pending posts
- X_POSTING_WORKFLOW.md — documentation

All other content/X/dashboard clutter has been archived.
