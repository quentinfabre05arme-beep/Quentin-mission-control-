/**
 * System Health Monitor
 * Proactive monitoring with auto-fix capabilities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALERT_FILE = path.join(__dirname, '..', '..', 'logs', 'health_alerts.jsonl');
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

class SystemHealthMonitor {
  constructor() {
    this.thresholds = {
      diskWarning: 85,
      diskCritical: 90,
      memoryWarning: 85,
      memoryCritical: 92,
      apiWarning: 80,
      dataFreshness: 60 // minutes
    };
    this.checks = [];
  }

  async checkAll() {
    const results = [];
    
    results.push(await this.checkDiskSpace());
    results.push(await this.checkMemory());
    results.push(await this.checkApiLimits());
    results.push(await this.checkCronJobs());
    results.push(await this.checkDataFreshness());
    
    return results;
  }

  async checkDiskSpace() {
    try {
      const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
      const lines = output.trim().split('\n').slice(1);
      
      let maxUsage = 0;
      let alerts = [];
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const caption = parts[0];
          const freeSpace = parseInt(parts[1]);
          const totalSize = parseInt(parts[2]);
          
          if (totalSize > 0) {
            const usage = ((totalSize - freeSpace) / totalSize) * 100;
            maxUsage = Math.max(maxUsage, usage);
            
            if (usage > this.thresholds.diskCritical) {
              alerts.push({
                level: 'CRITICAL',
                message: `Disk ${caption}: ${usage.toFixed(1)}% full`,
                autoFix: this.autoCleanDisk()
              });
            } else if (usage > this.thresholds.diskWarning) {
              alerts.push({
                level: 'WARNING',
                message: `Disk ${caption}: ${usage.toFixed(1)}% full`
              });
            }
          }
        }
      }
      
      return { check: 'disk', usage: maxUsage, alerts };
    } catch (error) {
      return { check: 'disk', error: error.message };
    }
  }

  async checkMemory() {
    try {
      const output = execSync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /VALUE', { encoding: 'utf8' });
      const lines = output.split('\n');
      
      let total = 0, free = 0;
      
      for (const line of lines) {
        if (line.includes('TotalVisibleMemorySize')) {
          total = parseInt(line.split('=')[1]);
        }
        if (line.includes('FreePhysicalMemory')) {
          free = parseInt(line.split('=')[1]);
        }
      }
      
      const usedPercent = ((total - free) / total) * 100;
      const alerts = [];
      
      if (usedPercent > this.thresholds.memoryCritical) {
        alerts.push({
          level: 'CRITICAL',
          message: `Memory: ${usedPercent.toFixed(1)}% used`
        });
      } else if (usedPercent > this.thresholds.memoryWarning) {
        alerts.push({
          level: 'WARNING',
          message: `Memory: ${usedPercent.toFixed(1)}% used`
        });
      }
      
      return { check: 'memory', usage: usedPercent, alerts };
    } catch (error) {
      return { check: 'memory', error: error.message };
    }
  }

  async checkApiLimits() {
    const alerts = [];
    
    // Check Twelve Data usage (track from logs)
    const twelveDataCalls = await this.countApiCalls('twelvedata');
    if (twelveDataCalls > 680) { // 80% of 800
      alerts.push({
        level: 'WARNING',
        message: `Twelve Data: ${twelveDataCalls}/800 calls used (${(twelveDataCalls/800*100).toFixed(0)}%)`
      });
    }
    
    // Check Serper usage
    const serperCalls = await this.countApiCalls('serper');
    if (serperCalls > 2000) { // 80% of 2500
      alerts.push({
        level: 'WARNING',
        message: `Serper: ${serperCalls}/2500 calls used (${(serperCalls/2500*100).toFixed(0)}%)`
      });
    }
    
    return { check: 'api', alerts };
  }

  async checkCronJobs() {
    const alerts = [];
    
    try {
      // Check if gateway is running
      try {
        execSync('tasklist | findstr openclaw', { encoding: 'utf8' });
      } catch {
        alerts.push({
          level: 'CRITICAL',
          message: 'OpenClaw gateway not running',
          autoFix: this.restartGateway()
        });
      }
      
      // Check for failed cron jobs (would need to parse logs)
      const failedJobs = await this.checkFailedCronJobs();
      if (failedJobs.length > 0) {
        alerts.push({
          level: 'WARNING',
          message: `${failedJobs.length} cron jobs failed`,
          details: failedJobs
        });
      }
    } catch (error) {
      alerts.push({ level: 'ERROR', message: error.message });
    }
    
    return { check: 'cron', alerts };
  }

  async checkDataFreshness() {
    const alerts = [];
    
    // Check market data timestamp
    const marketDataPath = path.join(__dirname, '..', '..', 'mission_control', 'market_data.json');
    if (fs.existsSync(marketDataPath)) {
      const stats = fs.statSync(marketDataPath);
      const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
      
      if (ageMinutes > this.thresholds.dataFreshness) {
        alerts.push({
          level: 'WARNING',
          message: `Market data is ${Math.round(ageMinutes)} minutes old`
        });
      }
    }
    
    return { check: 'data_freshness', alerts };
  }

  async countApiCalls(provider) {
    // Parse logs to count API calls
    const logPath = path.join(LOG_DIR, 'api_calls.log');
    if (!fs.existsSync(logPath)) return 0;
    
    const logs = fs.readFileSync(logPath, 'utf8');
    const matches = logs.match(new RegExp(provider, 'gi'));
    return matches ? matches.length : 0;
  }

  async checkFailedCronJobs() {
    // Check for recent failures in logs
    const cronLogPath = path.join(LOG_DIR, 'cron_errors.log');
    if (!fs.existsSync(cronLogPath)) return [];
    
    const logs = fs.readFileSync(cronLogPath, 'utf8');
    const lines = logs.split('\n').filter(line => line.includes('ERROR'));
    
    // Return last 5 unique failures
    return [...new Set(lines)].slice(-5);
  }

  async autoCleanDisk() {
    try {
      // Clean old logs
      const logsDir = path.join(__dirname, '..', '..', 'logs');
      const files = fs.readdirSync(logsDir);
      
      let cleaned = 0;
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < weekAgo && file.endsWith('.log')) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
      
      return { action: 'clean_logs', cleaned };
    } catch (error) {
      return { action: 'clean_logs', error: error.message };
    }
  }

  async restartGateway() {
    try {
      execSync('openclaw gateway restart', { encoding: 'utf8' });
      return { action: 'restart_gateway', status: 'success' };
    } catch (error) {
      return { action: 'restart_gateway', error: error.message };
    }
  }

  async logAlerts(results) {
    for (const result of results) {
      if (result.alerts && result.alerts.length > 0) {
        for (const alert of result.alerts) {
          const entry = {
            timestamp: new Date().toISOString(),
            check: result.check,
            level: alert.level,
            message: alert.message,
            autoFixed: alert.autoFix ? true : false
          };
          
          fs.appendFileSync(ALERT_FILE, JSON.stringify(entry) + '\n');
        }
      }
    }
  }
}

module.exports = SystemHealthMonitor;
