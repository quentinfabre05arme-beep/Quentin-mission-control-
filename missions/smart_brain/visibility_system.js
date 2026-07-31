const fs = require('fs');
const path = require('path');

class VisibilitySystem {
    constructor(options = {}) {
        this.logFile = options.logFile || path.join(__dirname, 'work_log.json');
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

    saveLogs() {
        fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    }

    log(action, details = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            ...details
        };
        
        this.logs.push(entry);
        
        // Keep only last 200 entries
        if (this.logs.length > 200) {
            this.logs.shift();
        }
        
        this.saveLogs();
        
        console.log(`[Visibility] ${action}`);
    }

    getRecentLogs(limit = 20) {
        return this.logs.slice(-limit).reverse();
    }

    getStats() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const todayLogs = this.logs.filter(log => log.timestamp.startsWith(today));
        
        return {
            totalActions: this.logs.length,
            todayActions: todayLogs.length,
            lastAction: this.logs.length > 0 ? this.logs[this.logs.length - 1] : null
        };
    }

    generateReport() {
        const stats = this.getStats();
        const recent = this.getRecentLogs(10);
        
        return {
            generatedAt: new Date().toISOString(),
            stats,
            recentActions: recent
        };
    }
}

module.exports = VisibilitySystem;