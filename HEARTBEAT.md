# Claw Full Power Heartbeat

## Every 30 minutes
- [ ] Check system health (RAM, disk, processes)
- [ ] Verify OpenClaw gateway is responsive
- [ ] Run recovery if any issues detected

## Every hour
- [ ] **Hourly status report** (was every 15 min — user requested hourly)
- [ ] Refresh market data
- [ ] Update dashboard if data is stale
- [ ] Review any pending alerts
- [ ] Run git backup if changes exist

## Daily (08:00)
- [ ] Generate newsletter draft
- [ ] Check trading signals
- [ ] Review portfolio positions
- [ ] Update MEMORY.md with significant events

## Daily (20:00)
- [ ] Generate evening research wrap
- [ ] Check next-day calendar
- [ ] Prepare market open briefing

## Continuous
- [ ] Self-healing: RAM >90%, Disk >90%, process crashes
- [ ] Auto-restart on failure
- [ ] Log all actions to memory
- [ ] Never stay offline

---
*Full Power Mode v5.0*
*Merged: Grok framework + Claw automations*
*Status reporting: Every hour (changed from 15 min)*
