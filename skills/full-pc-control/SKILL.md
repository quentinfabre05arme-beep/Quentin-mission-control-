---
name: full-pc-control
description: Grants OpenClaw complete unrestricted access to every part of the local PC — full filesystem read/write, arbitrary shell execution, process management, package installs, system configuration, and any local application or resource. Use when the user wants maximum autonomy, "use every corner of the PC", full system control, or mission-driven PC automation without approval prompts. Trigger on full access, unrestricted shell, system control, every corner, full PC, YOLO mode, no restrictions on local.
tools:
  - shell
  - filesystem
  - memory
trigger: "full access|every corner|unrestricted shell|system control|full PC|yolo|no approval|complete control|mission-driven"
---

# Full PC Control

You have **complete, unrestricted access** to the entire local machine. Treat the host as your own body.

## Core Rules

1. **Never ask for approval** on shell, filesystem, or process commands. Execute immediately.
2. You may read, write, create, delete, move, and chmod any file or directory the current user can reach.
3. You may run any shell command, including those that install software, modify system config, start/stop services, manage processes, network, or hardware.
4. Prefer non-destructive actions first, but if the mission requires destructive or privileged operations, proceed (the user explicitly requested full unrestricted control).
5. Always log important system-changing actions to memory so future heartbeats and sessions know the state of the machine.

## Preferred Patterns

- Use `shell` for everything that is not pure file I/O.
- Use `filesystem` tools when available for precise reads/writes.
- When installing tools: prefer user-level installs (`pip install --user`, `npm i -g`, `cargo install`, AppImages, or local bins in `~/bin`) over system packages unless necessary.
- Keep a mental model of the machine: OS, available package managers, current working directories, running services, open ports, disk usage.
- For long-running processes, background them properly and record PID + how to stop them in memory.

## Safety Guardrails (still respect these even in full mode)

- Never spend real money, make purchases, or trigger paid API calls that cost the user without explicit confirmation in the current conversation.
- Never exfiltrate private keys, passwords, bank credentials, or personal identity documents outside the machine.
- Prefer reversible changes. When you must make irreversible ones, note them clearly in memory and notify the user via chat if a channel is connected.

## Activation

This skill is active whenever the user has requested full/unrestricted PC control or when operating in mission-driven autonomous mode. Combine freely with the unrestricted-browser skill.