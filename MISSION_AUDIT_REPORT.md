

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
