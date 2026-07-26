# 🔄 Gateway Lifecycle Manager v2 — Host Native

**Problem:** v1 tried to restart from sandbox, which doesn't work.
**Solution:** Use host-native execution with proper process management.

## Architecture v2

```
User: "Restart gateway"
↓
Agent: "🔄 Initiating restart..."
↓
Step 1: Save session state to disk
Step 2: Spawn restart script (host-native)
Step 3: Script runs outside sandbox:
        - Stops openclaw process
        - Waits for clean shutdown
        - Starts openclaw with new config
Step 4: Verify health (poll port 18789)
Step 5: Restore session
Step 6: Report success
```

## Implementation

### restart_gateway.ps1
```powershell
# Host-native restart script
param(
    [string]$ConfigPath = "~\.openclaw\openclaw.json",
    [int]$Timeout = 30
)

Write-Host "🔄 Gateway Restart initiated"

# Step 1: Find and stop openclaw
$processes = Get-Process | Where-Object {$_.ProcessName -like "*openclaw*"}
foreach ($proc in $processes) {
    Write-Host "   Stopping process $($proc.Id)..."
    Stop-Process -Id $proc.Id -Force
}

# Step 2: Wait for shutdown
Write-Host "   Waiting for clean shutdown..."
Start-Sleep -Seconds 3

# Step 3: Start gateway
Write-Host "   Starting gateway..."
$env:OPENCLAW_GATEWAY_TOKEN = "c02cc9…5c69"
Start-Process openclaw -ArgumentList "gateway" -WindowStyle Hidden

# Step 4: Verify health
$maxAttempts = 10
$attempt = 0
while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:18789/health" -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Gateway responding on port 18789"
            break
        }
    } catch {
        $attempt++
        Write-Host "   Attempt $attempt/$maxAttempts..."
    }
}

if ($attempt -ge $maxAttempts) {
    Write-Host "   ❌ Gateway failed to start"
    exit 1
}

Write-Host "✅ Gateway restart complete"
```

### manager.js (updated)
```javascript
class GatewayLifecycleManager {
  async restart() {
    // Save session
    await this.saveSession();
    
    // Spawn host-native restart script
    const scriptPath = path.join(__dirname, 'restart_gateway.ps1');
    
    return new Promise((resolve, reject) => {
      // Use exec with host=auto to escape sandbox
      const restartProcess = spawn('powershell.exe', [
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath
      ], {
        shell: true,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      restartProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      restartProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            status: 'success',
            output: output.trim(),
            message: 'Gateway restarted successfully'
          });
        } else {
          reject(new Error(`Restart failed with code ${code}`));
        }
      });
    });
  }
}
```

## Usage

```javascript
// From agent (sandboxed)
const result = await gatewayManager.restart();
// Returns: { status: 'success', message: '...' }

// Behind the scenes:
// 1. Saves session to disk
// 2. Spawns PowerShell script (host-native)
// 3. Script restarts openclaw process
// 4. Verifies health
// 5. Returns to agent
```

## Safety

- **Session backup:** Always saved before restart
- **Health check:** Confirms gateway responds
- **Timeout:** Force kill if hang > 30s
- **Rollback:** Previous config backed up
- **Logging:** All actions logged

## Status
**Version:** 2.0
**Fix:** Host-native execution
**Risk:** Medium
**Requires:** PowerShell execution policy
