# 🔄 Gateway Lifecycle Manager

**Description:** Start, stop, restart, and monitor the OpenClaw gateway without interrupting the agent session.

## Problem

**Current:** To restart gateway, user must run terminal commands which interrupts the agent.

**Solution:** Agent-initiated gateway management that preserves session state.

## Architecture

```
User: "Restart gateway"
↓
Agent: "Will restart in 5 seconds..."
↓
Agent: Spawns background process
       → Stops gateway
       → Waits for clean shutdown
       → Starts gateway with new config
       → Verifies health
       → Reports back to user
↓
Agent: "✅ Gateway restarted. All plugins loaded."
```

## Key Innovation

### Session Persistence
```javascript
// Before restart
const sessionState = {
  skills: [...],
  context: {...},
  pendingTasks: [...]
};

// Save to disk
saveSession(sessionState);

// After restart
const restoredState = loadSession();
// Resume where we left off
```

### Async Operation
```javascript
// Agent continues while restart happens in background
const restartPromise = gatewayManager.restartAsync();

// Agent can still respond to user
sendMessage("Restart in progress...");

// When done, notify
restartPromise.then(() => {
  sendMessage("✅ Restart complete!");
});
```

## Commands

| Command | Action | Safe? |
|---------|--------|-------|
| `gateway status` | Check if running | ✅ Yes |
| `gateway start` | Start if stopped | ✅ Yes |
| `gateway stop` | Stop gracefully | ⚠️ Ask first |
| `gateway restart` | Stop + Start | ⚠️ Ask first |
| `gateway reload` | Reload config | ✅ Yes |
| `gateway health` | Check health | ✅ Yes |

## Implementation

```javascript
class GatewayLifecycleManager {
  async restart() {
    // 1. Save session state
    await this.saveSession();
    
    // 2. Spawn background restart
    const restartProcess = spawn('openclaw', ['gateway', 'restart']);
    
    // 3. Wait for completion
    await waitForHealthCheck();
    
    // 4. Restore session
    await this.restoreSession();
    
    // 5. Verify plugins loaded
    await this.verifyPlugins();
    
    return { status: 'success', duration: '5s' };
  }
}
```

## Safety Features

- **Graceful shutdown:** Wait for pending operations
- **Timeout:** Force kill if hang > 30s
- **Rollback:** Restore previous config if new fails
- **Health check:** Verify gateway responds before declaring success
- **Session backup:** Save context before, restore after

## Usage

```
You: "Restart gateway with new plugins"
Me: "🔄 Initiating restart..."
     (Background process starts)
     (Session saved)
     (Gateway stops...)
     (Gateway starts...)
     (Plugins loading...)
Me: "✅ Restart complete!"
     "Loaded plugins: duckduckgo, elevenlabs"
     "Web search: Active"
     "All systems operational"
```

## Status
**Version:** 1.0
**Risk:** Medium (gateway restart affects all sessions)
**Safety:** Always asks before restart, backs up session
