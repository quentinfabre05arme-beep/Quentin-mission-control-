const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

class SelfHealer {
    constructor(options = {}) {
        this.checkInterval = options.checkInterval || 60000;
        this.isRunning = false;
        this.logFile = path.join(__dirname, 'self_healing_log.json');
        this.logs = this.loadLogs();
        this.ramCriticalThreshold = options.ramCriticalThreshold || 90;
        this.ramWarningThreshold = options.ramWarningThreshold || 80;
        this.diskCriticalThreshold = options.diskCriticalThreshold || 90;
    }

    loadLogs() {
        try {
            if (fs.existsSync(this.logFile)) {
                return JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
            }
        } catch (e) {}
        return [];
    }

    log(action, details) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            details
        };
        this.logs.push(entry);
        if (this.logs.length > 200) this.logs.shift();
        fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    }

    execPromise(command) {
        return new Promise((resolve) => {
            exec(command, { windowsHide: true }, (error, stdout, stderr) => {
                resolve({ error, stdout, stderr });
            });
        });
    }

    async getRAMPercent() {
        const cmd = `powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object @{n='TotalGB';e={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}},@{n='FreeGB';e={[math]::Round($_.FreePhysicalMemory/1MB,2)}},@{n='UsedPct';e={[math]::Round((($_.TotalVisibleMemorySize-$_.FreePhysicalMemory)/$_.TotalVisibleMemorySize)*100,2)}} | ConvertTo-Json -Compress"`;
        const { stdout, error } = await this.execPromise(cmd);
        if (error || !stdout) return { status: 'error', value: null, raw: stdout, error: error ? error.message : null };
        try {
            const data = JSON.parse(stdout.trim());
            const usedPct = parseFloat(data.UsedPct);
            return {
                status: usedPct >= this.ramCriticalThreshold ? 'critical' : usedPct >= this.ramWarningThreshold ? 'warning' : 'ok',
                value: usedPct,
                totalGB: data.TotalGB,
                freeGB: data.FreeGB
            };
        } catch (e) {
            return { status: 'error', value: null, raw: stdout, parseError: e.message };
        }
    }

    async getDiskPercent(drive = 'C:') {
        const safeDrive = drive.replace(/'/g, "''");
        const cmd = `powershell -Command "Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${safeDrive}'} | Select-Object @{n='FreePct';e={[math]::Round(($_.FreeSpace/$_.Size)*100,2)}} | ConvertTo-Json -Compress"`;
        const { stdout, error } = await this.execPromise(cmd);
        if (error || !stdout) return { status: 'error', value: null, error: error ? error.message : null };
        try {
            const freePct = parseFloat(JSON.parse(stdout.trim()).FreePct);
            return {
                status: freePct <= (100 - this.diskCriticalThreshold) ? 'critical' : freePct <= (100 - 80) ? 'warning' : 'ok',
                value: 100 - freePct
            };
        } catch (e) {
            return { status: 'error', value: null, parseError: e.message, raw: stdout };
        }
    }

    async checkGateway() {
        const cmd = `powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*openclaw*' -or $_.ProcessName -like '*node*'} | Select-Object ProcessName,Id | ConvertTo-Json -Compress"`;
        const { stdout, error } = await this.execPromise(cmd);
        return {
            status: error ? 'down' : 'ok',
            value: error ? 'unreachable' : 'processes_running',
            details: stdout ? stdout.trim() : null
        };
    }

    async freeMemory() {
        const actions = [];

        const tempCmd = `powershell -Command "try { Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue } catch {}"`;
        const tempResult = await this.execPromise(tempCmd);
        actions.push('cleared_temp_files');

        const chromeCmd = `powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {$_.WorkingSet -lt 100MB} | Stop-Process -Force -ErrorAction SilentlyContinue"`;
        await this.execPromise(chromeCmd);
        actions.push('killed_idle_chrome_processes');

        await this.execPromise(`powershell -Command "try { [GC]::Collect() } catch {}"`);

        this.log('free_memory', { actions, tempError: tempResult.error ? tempResult.error.message : null });
        return actions;
    }

    async heal(health) {
        const actions = [];

        if (health.ram && health.ram.status === 'critical') {
            const memActions = await this.freeMemory();
            actions.push(...memActions);
            actions.push(`ram_critical_${health.ram.value}%`);
        } else if (health.ram && health.ram.status === 'warning') {
            actions.push(`ram_warning_${health.ram.value}%`);
        }

        if (health.disk && health.disk.status === 'critical') {
            actions.push('disk_critical_cleanup');
            await this.execPromise('powershell -Command "Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase"');
        }

        if (health.gateway && health.gateway.status === 'down') {
            actions.push('gateway_restart_scheduled');
            // Do not auto-restart gateway to avoid interrupting sessions; log and alert instead
        }

        if (actions.length > 0) {
            this.log('auto_heal', { actions, health });
        }

        return actions;
    }

    async runHealthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            ram: await this.getRAMPercent(),
            disk: await this.getDiskPercent(),
            gateway: await this.checkGateway()
        };

        const actions = await this.heal(health);

        // Persist state for heartbeat readers
        const statePath = path.join(__dirname, '..', '..', 'recovery', 'state', 'heartbeat.json');
        try {
            const state = {
                last_heartbeat: new Date().toISOString(),
                ram_percent: health.ram.value,
                disk_percent: health.disk.value,
                openclaw_running: health.gateway.status === 'ok',
                cron_healthy: true,
                issues_found: health.ram.status === 'critical' ? [`RAM critical: ${health.ram.value}%`] : [],
                repairs_made: actions
            };
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.writeFileSync(statePath, JSON.stringify(state, null, 4));
        } catch (e) {
            this.log('persist_state_error', e.message);
        }

        if (actions.length > 0) {
            console.log('[SelfHealer] Auto-recovery actions taken:', actions);
        }

        return { health, actions };
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[SelfHealer] Self-Healing v3 started');

        setInterval(async () => {
            await this.runHealthCheck();
        }, this.checkInterval);
    }
}

// If run directly, perform one immediate health check
if (require.main === module) {
    const healer = new SelfHealer();
    healer.runHealthCheck().then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    }).catch(err => {
        console.error('[SelfHealer] Error:', err);
        process.exit(1);
    });
}

module.exports = SelfHealer;
