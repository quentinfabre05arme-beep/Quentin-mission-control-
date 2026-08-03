

---

## Mission-by-Mission Audit: Core Systems

### Legend
| Symbol | Meaning |
|---|---|
| ✅ | Active / Integrated |
| ⚠️ | Needs attention |
| ❌ | Unused / Dead code |
| 📅 | Scheduled |
| ♻️ | Resident loop |

---

### 1. Unified Master Orchestrator
| Field | Value |
|---|---|
| **File** | `project_claw_core/core/unified_master_orchestrator.js` |
| **Purpose** | Top-level coordinator: market data, research, Smart Brain routing, health, Telegram reports, git commit. |
| **Runs 24/7?** | ✅ Yes — `setInterval` loop + Task Scheduler `OpenClaw-Unified-Master` (10 min) + PowerShell `while($true)` |
| **Necessary?** | ✅ Yes. Central nervous system of Claw. |
| **Improvements** | • Add more defensive timeout wrappers around external API calls. • Reduce state.json write frequency to lower disk I/O. |

### 2. ABOS (Autonomous Business Operating System)
| Field | Value |
|---|---|
| **File** | `autonomous_business/core/abos_orchestrator.js` |
| **Purpose** | Business task runner, newsletter/content pipeline. |
| **Runs 24/7?** | ✅ Yes — `setInterval` loop + Task Scheduler `OpenClaw-ABOS` (hourly) + PowerShell loop |
| **Necessary?** | ✅ Yes. Handles business automation outside trading. |
| **Improvements** | • Add dead-letter queue for failed business tasks. • Consider splitting newsletter into its own task if it grows. |

### 3. Autonomous Improvement Engine
| Field | Value |
|---|---|
| **File** | `autonomous_improvement/core/improvement_orchestrator.js` |
| **Purpose** | Self-audit, hypothesis generation, code experiments, commits. |
| **Runs 24/7?** | ✅ Yes — `setInterval` loop + Task Scheduler `OpenClaw-Autonomous-Improvement` (logon) + PowerShell `while($true)` sleep 30 min |
| **Necessary?** | ✅ Yes. Drives continuous improvement. |
| **Improvements** | • Add stronger sandboxing before applying diffs. • Implement rollback-on-failure timer. |

### 4. Alpha Fund Always-On Daemon
| Field | Value |
|---|---|
| **File** | `alpha_fund_v3/core/always_on_daemon.js` |
| **Purpose** | Keeps Alpha Fund processes alive, runs capability verifier. |
| **Runs 24/7?** | ✅ Yes — `setInterval` 60s + Task Scheduler `OpenClaw-Always-On-Daemon` (logon) + PowerShell loop |
| **Necessary?** | ✅ Yes. Watchdog + research loop host. |
| **Improvements** | • Capability verifier now has PID lock (done). • Add RAM-based circuit breaker to prevent runaway restarts. |

### 5. Alpha Fund Orchestrator
| Field | Value |
|---|---|
| **File** | `alpha_fund_v3/orchestrator.js` |
| **Purpose** | CLI entry point for trading commands, portfolio CRUD, execution. |
| **Runs 24/7?** | ❌ No — it is a CLI tool with no internal loop. |
| **Necessary?** | ⚠️ Yes, but invoked by the daemon and scheduled tasks, not as a resident process. |
| **Improvements** | • Add a `loop` CLI mode so it can optionally run standalone. • Currently fine as a library. |

### 6. Gateway Ultra-Immortality
| Field | Value |
|---|---|
| **File** | `alpha_fund_v3/core/gateway_ultra.js` |
| **Purpose** | Resurrects the OpenClaw gateway if it dies (RAM kill + restart). |
| **Runs 24/7?** | ✅ Now yes — v2.1 added `setInterval` self-loop. Task Scheduler integration optional. |
| **Necessary?** | ⚠️ Useful, but overlaps with `OpenClaw Gateway` task and gateway's own restart. Consider making it a fallback only. |
| **Improvements** | • Consider reducing `ram_restart_threshold` from 94% to avoid false restarts. • Wire to Task Scheduler `Claw-Gateway-Guardian` instead of standalone loop. |

### 7. Smart Brain
| Field | Value |
|---|---|
| **File** | `missions/smart_brain/` |
| **Purpose** | Model routing (orchestrator, router v3, model switcher). |
| **Runs 24/7?** | ✅ Now yes — integrated into Unified Master model routing step. |
| **Necessary?** | ✅ Yes. Routes tasks to appropriate models (coder, analyst, fast, etc.). |
| **Improvements** | • Add real model execution confidence tracking. • Persist routing outcomes to `project_claw_core/data/routing_stats.json`. |

### 8. Unified Finance Manager
| Field | Value |
|---|---|
| **File** | `missions/unified_finance_manager.js` |
| **Purpose** | Daily market snapshot, alternative data, TA, portfolio tracking, risk alerts, report generation. |
| **Runs 24/7?** | ✅ Now scheduled daily 08:05 via `OpenClaw-Finance-Daily`. |
| **Necessary?** | ✅ Yes. Consolidates market/portfolio reporting. |
| **Improvements** | • Wire email sending to stored Gmail OAuth. • Add Slack/Telegram delivery of report. |

### 9. Capability Verifier
| Field | Value |
|---|---|
| **File** | `capability_verification_runner.js` |
| **Purpose** | Tests all real capabilities for syntax/runtime health. |
| **Runs 24/7?** | ✅ Invoked by always-on daemon every 10 min; PID lock prevents duplicates. |
| **Necessary?** | ✅ Yes. Prevents broken capabilities from going unnoticed. |
| **Improvements** | • Add per-capability pass/fail trend graphing. • Shorten timeout per capability to avoid hanging. |

### 10. Capability Library (`project_claw_core/core/*.js`)
| Field | Value |
|---|---|
| **Examples** | `agent_swarm.js`, `capability_invoker.js`, `scheduler_agent.js`, `reasoning_engine.js`, `status_reporter.js`, `system_health_monitor.js`, `verifier.js`, `learning_engine.js` |
| **Purpose** | Reusable building blocks: health monitoring, scheduling, reasoning, verification, learning. |
| **Runs 24/7?** | ❌ No — they are libraries, not daemons. |
| **Necessary?** | ✅ Yes. They are imported by orchestrators. |
| **Improvements** | • Many are small stubs (50-150 lines). Merge or document which are actually used. • `verifier.js` has no class — refactor to match others. |

### 11. Agents (`project_claw_core/agents/`)
| Field | Value |
|---|---|
| **Count** | 43 files (AWS, browser, GitHub, Gmail, LinkedIn, X, Discord, etc.) |
| **Purpose** | Connectors for external services and tools. |
| **Runs 24/7?** | ❌ No — invoked on demand by orchestrators. |
| **Necessary?** | ✅ Yes (for capabilities), but many require credentials. |
| **Improvements** | • Audit which agents have been used in the last 30 days. • Archive unused credential-bound agents to reduce attack surface. |

### 12. Newsletter System
| Field | Value |
|---|---|
| **File** | `content_pipeline/newsletter/run_newsletter.ps1` |
| **Purpose** | Generates weekly newsletter. |
| **Runs 24/7?** | 📅 Weekly via `AlphaFund-Newsletter-Weekly`. |
| **Necessary?** | ✅ Yes. Revenue stream. |
| **Improvements** | • Verify it still runs correctly post-cleanup. • Add retry + fallback to manual draft on failure. |

### 13. X Posting Stack
| Field | Value |
|---|---|
| **Files** | `x_poster.js`, `x_poster_daemon.js`, `x_post_browser.js`, `x_post_simple.ps1`, `x_post_scheduler.ps1`, `x_queue.json` |
| **Purpose** | Queue and publish posts to X/Twitter without API fees. |
| **Runs 24/7?** | 📅 Daily 08:00 via `OpenClaw-X-Autonomous-Poster`. |
| **Necessary?** | ✅ Yes. Audience/signal distribution. |
| **Improvements** | • Add 2nd daily post slot (14:00) if content queue allows. • Add success/failure metric to report. |

### 14. Dashboard (`project_claw_core/dashboard/`)
| Field | Value |
|---|---|
| **Purpose** | HTML dashboards for system status and market data. |
| **Runs 24/7?** | ❌ Static files; served by Vercel/CDN, not local process. |
| **Necessary?** | ⚠️ Useful for external visibility. Local HTML files are stale after cleanup. |
| **Improvements** | • Either refresh data into HTML automatically or move to dynamic single-page app. • Current static files likely outdated. |

### 15. Investment Fund / Alternative Data (`investment_fund/`)
| Field | Value |
|---|---|
| **Files** | `fetch_alternative_data.js`, `market_data_service.js`, etc. |
| **Purpose** | External data aggregation (fear/greed, funding, on-chain). |
| **Runs 24/7?** | 📅 Unified Finance Manager invokes daily; also available on-demand. |
| **Necessary?** | ✅ Yes. Provides signal inputs. |
| **Improvements** | • Fix Serper.dev zero-results issue. • Add Glassnode/exchange-flows fallback. |

---

## Verdict Table

| Mission/System | Status | 24/7 | Action |
|---|---|---|---|
| Unified Master | ✅ | ♻️ | Keep |
| ABOS | ✅ | ♻️ | Keep |
| Autonomous Improvement | ✅ | ♻️ | Keep |
| Alpha Daemon | ✅ | ♻️ | Keep |
| Alpha Orchestrator | ⚠️ | CLI | Keep as library |
| Gateway Ultra | ✅ | ♻️ | Tune threshold |
| Smart Brain | ✅ | Integrated | Keep |
| Unified Finance | ✅ | 📅 08:05 | Keep |
| Capability Verifier | ✅ | Triggered | Keep |
| Capability Library | ✅ | Library | Keep; refactor stubs |
| Agents | ✅ | Library | Keep; credential-audit later |
| Newsletter | ✅ | 📅 Weekly | Keep |
| X Posting | ✅ | 📅 Daily | Keep |
| Dashboard | ⚠️ | Static | Refresh or retire |
| Investment Fund Data | ✅ | 📅 + On-demand | Keep |

**Conclusion:** Every core mission now either runs on a schedule, is integrated into a resident loop, or is correctly classified as a library. No remaining mission-level orphan code. The only remaining concern is the static dashboard freshness.
