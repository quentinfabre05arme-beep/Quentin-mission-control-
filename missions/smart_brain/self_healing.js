const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

class SelfHealer {
    constructor(options = {}) {
        this.checkInterval = options.checkInterval || 60000;
        this.isRunning = false;
        this.logFile = path.join(__dirname, 'self_healing_log.json');
        this.logs = this.loadLogs();
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
        if (this.logs.length > 100) this.logs.shift();
        fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    }

    async checkRAM() {
        return new Promise((resolve) => {
            exec('powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory,TotalVisibleMemorySize"', (error, stdout) => {
                if (error) {
                    resolve({ status: 'error', value: null });
                    return;
                }
                // Simplified parsing
                resolve({ status: 'ok', value: 'checked' });
            });
        });
    }

    async checkDisk() {
        return new Promise((resolve) => {
            exec('powershell -Command "Get-PSDrive C | Select-Object Free,Used"', (error, stdout) => {
                resolve({ status: error ? 'error' : 'ok', value: 'checked' });
            });
        });
    }

    async checkGateway() {
        // Placeholder - would ping gateway health endpoint
        return { status: 'ok', value: 'responsive' };
    }

    async heal(health) {
        const actions = [];

        if (health.ram && health.ram.status === 'critical') {
            actions.push('Clearing temp files and killing excess Chrome processes');
            exec('powershell -Command "Get-Process chrome | Stop-Process -Force"', () => {});
            exec('powershell -Command "Remove-Item $env:TEMP\\* -Recurse -Force"', () => {});
        }

        if (health.gateway && health.gateway.status === 'down') {
            actions.push('Restarting gateway');
            exec('openclaw gateway restart', () => {});
        }

        if (actions.length > 0) {
            this.log('auto_heal', actions);
        }

        return actions;
    }

    async runHealthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            ram: await this.checkRAM(),
            disk: await this.checkDisk(),
            gateway: await this.checkGateway()
        };

        const actions = await this.heal(health);
        
        if (actions.length > 0) {
            console.log('[SelfHealer] Auto-recovery actions taken:', actions);
        }

        return { health, actions };
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[SelfHealer] Self-Healing v2 started');

        setInterval(async () => {
            await this.runHealthCheck();
        }, this.checkInterval);
    }
}

module.exports = SelfHealer;