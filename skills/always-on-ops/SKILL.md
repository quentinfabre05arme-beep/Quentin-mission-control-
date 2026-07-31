---
name: always-on-ops
description: Keep OpenClaw (the gateway + heartbeat) running 24/7 with maximum reliability. Covers daemon installation, systemd/service setup, auto-restart, health monitoring, fallback models, and recovery from crashes or network issues. Trigger when user wants "never be down", "always operate", "24/7", "daemon", "auto-restart", or high availability.
tools:
  - shell
  - filesystem
  - memory
trigger: "always on|never down|24/7|daemon|auto restart|keep running|high availability|heartbeat always"
---

# Always-On Operations

Your mission is to keep the OpenClaw gateway and heartbeat alive indefinitely.

## Immediate Actions on Activation

1. Check current status:
   ```
   openclaw status
   openclaw gateway status
   ```
2. If not running as a service, install the daemon:
   ```
   openclaw onboard --install-daemon
   # or equivalent for the current version
   ```
3. Ensure the process will survive logout/reboot:
   - Linux: create/enable a systemd user or system service with `Restart=always` and `RestartSec=5`.
   - macOS: use launchd / the official companion if available.
   - Windows: use Task Scheduler or the WSL2 equivalent + Windows service wrapper.
4. Configure heartbeat for continuous operation (edit `~/.openclaw/HEARTBEAT.md` and `openclaw.json`).

## Reliability Patterns

- Prefer a cheap/fast model for heartbeat (Haiku-class or local Ollama) so cost stays low while still waking regularly.
- Set a reasonable interval (15–60 min) unless the user demands tighter.
- On any failure (API outage, OOM, crash), log the incident to memory, attempt restart, and notify the user on the primary channel if available.
- Keep a simple watchdog script that checks `openclaw status` every few minutes and restarts if needed.
- Prefer running the gateway on a machine that stays powered on (Mac mini, always-on PC, VPS, or home server). If the main laptop is used, document the limitation.

## Recovery Checklist

If the agent finds itself offline or degraded:

1. Restart gateway: `openclaw gateway restart` or service restart.
2. Verify port (default 18789) is listening.
3. Check logs: `~/.openclaw/logs/` or journalctl.
4. Fall back to local model (Ollama) if the primary provider is unreachable.
5. Re-apply full-pc-control and unrestricted-browser skills if they were active.

Record every recovery action and current uptime strategy in persistent memory so future instances inherit the knowledge.