# 🔍 Multi-Agent System Caveats Audit

**Date:** 2026-07-26 16:25
**Status:** ⚠️ Issues found

## Critical Caveats Found

### 1. 🔴 Parallel Execution Hangs (Confirmed)
**Issue:** When running `orchestrator.js run`, all agents start simultaneously but the process hangs indefinitely.

**Root Cause:**
- `Promise.allSettled()` waits for ALL agents to complete
- If one agent's `require()` hangs or the script has an infinite loop, orchestrator waits forever
- No timeout mechanism on agent execution

**Evidence:**
- Session `rapid-bloom` ran for 30+ seconds with no output
- Process had to be killed manually
- State file shows `cycles: 0` (never completed)

**Fix Required:**
```javascript
// Add timeout to each agent
const AGENT_TIMEOUT = 30000; // 30 seconds

async runAgent(agentKey) {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), AGENT_TIMEOUT)
  );
  
  const agentPromise = this.runAgentLogic(agentKey);
  
  return Promise.race([agentPromise, timeoutPromise]);
}
```

### 2. 🔴 No Agent Isolation
**Issue:** All agents run in same Node.js process
- One agent crash kills all agents
- Memory leak in one agent affects all
- No process isolation

**Fix Required:**
Run each agent as separate child_process:
```javascript
const { spawn } = require('child_process');

async runAgent(agentKey) {
  const child = spawn('node', [this.agents[agentKey].script], {
    detached: true,
    timeout: 30000
  });
  
  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      resolve({ success: code === 0 });
    });
    
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('TIMEOUT'));
    }, 30000);
  });
}
```

### 3. 🔴 No Retry Logic
**Issue:** Agent fails once → never retried
- Transient errors (network, API rate limits) cause permanent failure
- No exponential backoff
- No circuit breaker pattern

**Fix Required:**
```javascript
async runWithRetry(agentKey, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.runAgent(agentKey);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### 4. 🟡 Race Condition on State File
**Issue:** Multiple agents may try to write state simultaneously
- File corruption risk
- Lost updates
- No file locking

**Fix Required:**
```javascript
// Use atomic writes
const tmpFile = STATE_FILE + '.tmp';
fs.writeFileSync(tmpFile, JSON.stringify(state));
fs.renameSync(tmpFile, STATE_FILE);
```

### 5. 🟡 No Health Checks Between Cycles
**Issue:** Orchestrator doesn't verify system health before starting cycle
- Could start agents when system is already unhealthy
- Wastes resources
- Could make things worse

**Fix Required:**
```javascript
async runAllAgents() {
  // Pre-flight check
  const health = await this.preFlightCheck();
  if (!health.ok) {
    this.log('Pre-flight check failed, skipping cycle');
    return { skipped: true, reason: health.reason };
  }
  
  // ... rest of run logic
}
```

### 6. 🟡 Missing Error Recovery
**Issue:** Agent errors logged but not acted upon
- System agent finds memory issue → logs it but doesn't fix
- No automatic remediation
- Requires human intervention

**Fix Required:**
Add self-healing to system agent:
```javascript
if (memInfo.percentUsed > 85) {
  this.killChrome();
  this.clearCaches();
  this.notify('Memory cleaned automatically');
}
```

### 7. 🟡 No Rate Limiting
**Issue:** Research agent hits API rate limits
- Twelve Data: 8 requests/minute
- Agent makes requests in rapid succession
- Gets banned temporarily

**Fix Required:**
```javascript
const rateLimiter = {
  lastCall: 0,
  minInterval: 8000, // 8 seconds between calls
  
  async wait() {
    const now = Date.now();
    const waitTime = this.lastCall + this.minInterval - now;
    if (waitTime > 0) await sleep(waitTime);
    this.lastCall = Date.now();
  }
};
```

### 8. 🟡 Hardcoded Paths
**Issue:** Scripts use absolute Windows paths
- Won't work on other machines
- Brittle if user profile changes
- Not portable

**Fix Required:**
```javascript
const path = require('path');
const os = require('os');

const BASE_DIR = path.join(os.homedir(), '.openclaw');
const WORKSPACE = path.join(BASE_DIR, 'workspace');
```

### 9. 🟡 No Notification on Critical Failures
**Issue:** Agent fails silently
- User not notified unless they check logs
- Critical issues could go unnoticed
- No escalation

**Fix Required:**
```javascript
async notifyUser(message, priority = 'normal') {
  if (priority === 'critical') {
    // Send Telegram message
    await fetch('https://api.telegram.org/...', {
      method: 'POST',
      body: JSON.stringify({ text: `🚨 ${message}` })
    });
  }
}
```

### 10. 🟡 Log Rotation Missing
**Issue:** Log files grow indefinitely
- `team_log.txt` will grow to GBs
- `system_agent.log` unbounded
- No cleanup

**Fix Required:**
```javascript
// Rotate logs daily
const logDate = new Date().toISOString().split('T')[0];
const logFile = `team_log_${logDate}.txt`;

// Clean old logs
const fs = require('fs');
const files = fs.readdirSync('.');
const oldLogs = files.filter(f => f.startsWith('team_log_') && !f.includes(logDate));
oldLogs.forEach(f => fs.unlinkSync(f));
```

## Summary Table

| # | Issue | Severity | Status | Effort |
|---|-------|----------|--------|--------|
| 1 | Parallel execution hangs | 🔴 Critical | Confirmed | Medium |
| 2 | No process isolation | 🔴 Critical | Found | High |
| 3 | No retry logic | 🔴 Critical | Found | Medium |
| 4 | Race condition on state | 🟡 Warning | Found | Low |
| 5 | No pre-flight checks | 🟡 Warning | Found | Low |
| 6 | Missing error recovery | 🟡 Warning | Found | Medium |
| 7 | No rate limiting | 🟡 Warning | Found | Low |
| 8 | Hardcoded paths | 🟡 Warning | Found | Low |
| 9 | No critical notifications | 🟡 Warning | Found | Medium |
| 10 | No log rotation | 🟡 Warning | Found | Low |

## Recommendations

### Immediate (Do Now)
1. Add timeout to orchestrator (prevents hangs)
2. Fix hardcoded paths
3. Add retry logic with exponential backoff

### Short Term (This Week)
4. Run agents as separate processes
5. Add pre-flight health checks
6. Implement rate limiting

### Medium Term (Next Sprint)
7. Add self-healing capabilities
8. Implement notifications
9. Add log rotation

## Testing Needed

1. Run full team cycle with timeout
2. Simulate agent failure
3. Test memory pressure scenario
4. Verify state file integrity after concurrent writes
5. Test API rate limit handling
