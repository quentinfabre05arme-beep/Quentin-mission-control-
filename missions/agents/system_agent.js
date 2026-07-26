// System Agent - Health monitoring, cleanup, optimization
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'system_agent.log');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

class SystemAgent {
  async run() {
    const results = {
      timestamp: new Date().toISOString(),
      checks: [],
      fixes: [],
      errors: []
    };

    // 1. Check memory
    try {
      const memInfo = this.checkMemory();
      results.checks.push({ type: 'memory', ...memInfo });
      
      if (memInfo.percentUsed > 85) {
        log('High memory detected, cleaning Chrome...');
        this.killChrome();
        results.fixes.push('killed_chrome');
      }
    } catch (e) {
      results.errors.push({ type: 'memory', error: e.message });
    }

    // 2. Check disk space
    try {
      const diskInfo = this.checkDiskSpace();
      results.checks.push({ type: 'disk', ...diskInfo });
    } catch (e) {
      results.errors.push({ type: 'disk', error: e.message });
    }

    // 3. Check OpenClaw health
    try {
      const health = this.checkOpenClawHealth();
      results.checks.push({ type: 'openclaw', ...health });
    } catch (e) {
      results.errors.push({ type: 'openclaw', error: e.message });
    }

    // 4. Clean old logs
    try {
      const cleaned = this.cleanOldLogs();
      results.fixes.push(`cleaned_${cleaned}_old_logs`);
    } catch (e) {
      results.errors.push({ type: 'cleanup', error: e.message });
    }

    // 5. Check for errors in recent logs
    try {
      const errors = this.checkRecentErrors();
      if (errors.length > 0) {
        results.checks.push({ type: 'errors', count: errors.length, samples: errors.slice(0, 3) });
      }
    } catch (e) {
      results.errors.push({ type: 'error_check', error: e.message });
    }

    log(`System check complete: ${results.fixes.length} fixes applied`);
    return results;
  }

  checkMemory() {
    const output = execSync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', { encoding: 'utf8' });
    const lines = output.split('\n');
    let total = 0, free = 0;
    
    for (const line of lines) {
      if (line.includes('TotalVisibleMemorySize')) total = parseInt(line.split('=')[1]) * 1024;
      if (line.includes('FreePhysicalMemory')) free = parseInt(line.split('=')[1]) * 1024;
    }
    
    const used = total - free;
    const percentUsed = Math.round((used / total) * 100);
    
    return { total, free, used, percentUsed };
  }

  checkDiskSpace() {
    const output = execSync('wmic logicaldisk get size,freespace,caption /value', { encoding: 'utf8' });
    const drives = [];
    const sections = output.split('\n\n');
    
    for (const section of sections) {
      const caption = section.match(/Caption=(.+)/)?.[1];
      const size = section.match(/Size=(.+)/)?.[1];
      const free = section.match(/FreeSpace=(.+)/)?.[1];
      
      if (caption && size && free) {
        const totalGB = Math.round(parseInt(size) / (1024**3));
        const freeGB = Math.round(parseInt(free) / (1024**3));
        drives.push({ drive: caption, totalGB, freeGB, percentFree: Math.round((freeGB/totalGB)*100) });
      }
    }
    
    return { drives };
  }

  checkOpenClawHealth() {
    try {
      // Check if OpenClaw processes exist
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf8' });
      const processes = output.split('\n').filter(l => l.includes('node.exe')).length;
      
      return { 
        status: processes > 0 ? 'running' : 'stopped',
        processes,
        healthy: processes > 0
      };
    } catch (e) {
      return { status: 'error', error: e.message, healthy: false };
    }
  }

  killChrome() {
    try {
      execSync('taskkill /F /IM chrome.exe /T', { stdio: 'pipe' });
      return true;
    } catch (e) {
      return false;
    }
  }

  cleanOldLogs() {
    const logsDir = 'C:\\Users\\quent\\.openclaw\\logs';
    let cleaned = 0;
    
    try {
      const files = fs.readdirSync(logsDir);
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    } catch (e) {
      console.error('Error cleaning logs:', e.message);
    }
    
    return cleaned;
  }

  checkRecentErrors() {
    const errors = [];
    
    // Check recent log files
    const logsDir = 'C:\\Users\\quent\\.openclaw\\logs';
    try {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files.slice(-3)) { // Last 3 files
        const content = fs.readFileSync(path.join(logsDir, file), 'utf8');
        const errorLines = content.split('\n').filter(line => 
          /ERROR|FATAL|CRITICAL|Exception|Failed/i.test(line)
        );
        errors.push(...errorLines.slice(-5));
      }
    } catch (e) {
      console.error('Error checking logs:', e.message);
    }
    
    return [...new Set(errors)].slice(-10); // Unique, last 10
  }
}

module.exports = new SystemAgent();
