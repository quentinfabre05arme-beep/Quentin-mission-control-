# Multi-Mission Management Architecture

## Problem Statement

Current state: All missions run in one Telegram conversation, causing:
- Context pollution between missions
- Mixed updates (research + trading + dashboard in same chat)
- Difficulty tracking which mission needs attention
- No separation of concerns

## Solution: Dedicated Mission Channels

### Architecture Overview

```
Quentin (Owner)
    ├── Main Control Channel (telegram:8685343197) ← Currently here
    │   └── You are here - main orchestration
    ├── 📊 Alpha Fund Channel (e.g., telegram:alpha-fund-group)
    │   └── Portfolio updates, trades, research
    ├── 💻 Dev/Architecture Channel (e.g., telegram:dev-claw)
    │   └── Code updates, deployments, system health
    ├── 📱 Dashboard Channel (e.g., telegram:dashboard-updates)
    │   └── Dashboard status, cycle updates
    └── 🎨 POD Business Channel (e.g., telegram:pod-business)
        └── Sales, designs, growth metrics
```

### Implementation Options

#### Option 1: Telegram Groups/Channels (Recommended)

**Setup:**
1. Create Telegram groups for each mission
2. Add OpenClaw bot to each group
3. Configure routing based on channel

**Pros:**
- Native Telegram support
- Easy to create/manage
- Free
- Real-time notifications

**Cons:**
- Requires manual group creation
- Bot needs to be in each group

**Implementation:**
```javascript
// mission_router.js
class MissionRouter {
  constructor() {
    this.channels = {
      'alpha-fund': 'telegram:alpha-fund-group-id',
      'dev': 'telegram:dev-claw-group-id',
      'dashboard': 'telegram:dashboard-updates-group-id',
      'pod-business': 'telegram:pod-business-group-id'
    };
  }

  routeMessage(mission, message) {
    const channel = this.channels[mission];
    if (channel) {
      return this.sendToChannel(channel, message);
    }
    // Fallback to main channel
    return this.sendToChannel('telegram:8685343197', `[${mission}] ${message}`);
  }
}
```

#### Option 2: Session-Based Management (OpenClaw Native)

**Using OpenClaw's session system:**
- Each mission gets its own session
- Sessions can be spawned with `sessions_spawn`
- Messages routed to appropriate session

**Implementation:**
```javascript
// Spawn mission-specific session
const missionSession = await sessions_spawn({
  task: "Alpha Fund Research Cycle",
  label: "alpha-fund",
  runtime: "subagent"
});

// Send updates to specific session
await sessions_send({
  sessionKey: missionSession,
  message: "Research cycle #54 complete"
});
```

**Pros:**
- Native OpenClaw support
- Automatic context isolation
- No external dependencies

**Cons:**
- Requires active session management
- Less visible than Telegram groups

#### Option 3: Hybrid Approach (Recommended)

**Combine both approaches:**
1. Telegram groups for visibility/notifications
2. OpenClaw sessions for execution isolation

**Architecture:**
```
Mission Trigger → OpenClaw Session (isolated execution)
                        ↓
               Telegram Group (notification)
                        ↓
               Owner sees update in dedicated channel
```

### Implementation Plan

#### Phase 1: Create Mission Channels

1. **Create Telegram Groups:**
   - "Alpha Fund Research" (for portfolio, trades, research)
   - "Claw Development" (for code, architecture, fixes)
   - "Mission Control" (for dashboard, cycles, alerts)
   - "POD Business" (for sales, designs, growth)

2. **Configure OpenClaw:**
   - Add bot to each group
   - Set up channel routing

#### Phase 2: Mission Router Implementation

```javascript
// missions/smart_brain/mission_router.js
class MissionRouter {
  constructor() {
    this.activeMissions = new Map();
    this.channelMap = new Map([
      ['alpha-fund', 'telegram:alpha-fund-group'],
      ['development', 'telegram:dev-claw-group'],
      ['dashboard', 'telegram:dashboard-updates-group'],
      ['pod-business', 'telegram:pod-business-group']
    ]);
  }

  // Start a new mission in isolated context
  async startMission(missionId, config) {
    const session = await sessions_spawn({
      task: config.task,
      label: missionId,
      runtime: "subagent",
      taskName: missionId
    });
    
    this.activeMissions.set(missionId, {
      session: session,
      channel: this.channelMap.get(missionId),
      status: 'running',
      startedAt: new Date().toISOString()
    });
    
    return session;
  }

  // Route update to appropriate channel
  async reportUpdate(missionId, update) {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      // Send to mission-specific channel
      await message({
        action: "send",
        channel: mission.channel,
        message: `[${missionId}] ${update}`
      });
    }
  }

  // Get status of all missions
  getMissionStatus() {
    const status = [];
    for (const [id, mission] of this.activeMissions) {
      status.push({
        id: id,
        status: mission.status,
        channel: mission.channel,
        runningSince: mission.startedAt
      });
    }
    return status;
  }
}
```

#### Phase 3: Mission Templates

Create mission-specific templates:

```javascript
// missions/templates/alpha_fund_mission.js
class AlphaFundMission {
  constructor() {
    this.name = 'alpha-fund';
    this.channel = 'telegram:alpha-fund-group';
  }

  async run() {
    // Research cycle
    const research = await this.runResearch();
    
    // Portfolio check
    const portfolio = await this.checkPortfolio();
    
    // Report to dedicated channel
    await this.report({
      research: research,
      portfolio: portfolio,
      timestamp: new Date().toISOString()
    });
  }

  async report(data) {
    await message({
      action: "send",
      channel: this.channel,
      message: this.formatReport(data)
    });
  }
}
```

### Current Mission Inventory

| Mission | Current Location | Proposed Channel | Status |
|---------|-----------------|------------------|--------|
| Alpha Fund Research | Main chat | #alpha-fund | Active |
| Dashboard Updates | Main chat | #dashboard | Active |
| Multi-Model Architecture | Main chat | #development | Complete |
| POD Business | Main chat | #pod-business | Active |
| Cron Jobs | Main chat | #system-health | Active |
| X Automation | Main chat | #social-media | Paused |

### Migration Plan

1. **Create channels** (5 min)
2. **Update routing** (15 min)
3. **Test each channel** (10 min)
4. **Migrate ongoing missions** (ongoing)

### Commands for Owner

**To check all mission statuses:**
```
/claw status
```

**To switch to mission channel:**
```
/claw switch alpha-fund
```

**To get mission-specific help:**
```
/claw help alpha-fund
```

---

## Recommendation

**Use Option 3: Hybrid Approach**
- Create Telegram groups for visibility
- Use OpenClaw sessions for execution
- Route all mission updates to appropriate channels
- Keep main channel for orchestration only

This gives you:
✅ Clean separation of concerns
✅ Dedicated channels for each mission
✅ No context pollution
✅ Easy to track what's happening where
✅ Scalable to new missions

---

**Status:** Research complete — ready to implement
**Next Action:** Create Telegram groups and configure routing
