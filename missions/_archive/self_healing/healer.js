// Self-Healing Mission - Automated error recovery
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'healer.log');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(LOG_FILE, line + '\n');
  console.log(message);
}

class SelfHealer {
  constructor() {
    this.fixes = [];
  }

  async run() {
    log('=== SELF-HEALING CYCLE STARTED ===');
    
    // 1. Check and fix OpenClaw processes
    await this.healOpenClaw();
    
    // 2. Check and fix memory issues
    await this.healMemory();
    
    // 3. Check and fix disk issues
    await this.healDisk();
    
    // 4. Check and fix config issues
    await this.healConfig();
    
    // 5. Check and fix log issues
    await this.healLogs();
    
    log(`=== CYCLE COMPLETE: ${this.fixes.length} fixes applied ===`);
    return { fixes: this.fixes };
  }

  async healOpenClaw() {
    try {
      // Check if OpenClaw is running
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf8' });
      const processes = output.split('\n').filter(l => l.includes('node.exe')).length;
      
      if (processes === 0) {
        log('🔴 OpenClaw not running, restarting...');
        // Restart OpenClaw
        execSync('cd C:\\Users\\quent\\.openclaw && start gateway.cmd', { stdio: 'pipe' });
        this.fixes.push('restarted_openclaw');
      }
    } catch (e) {
      log(`Error healing OpenClaw: ${e.message}`);
    }
  }

  async healMemory() {
    try {
      const memInfo = this.checkMemory();
      
      if (memInfo.percentUsed > 90) {
        log('🔴 Memory critical, cleaning...');
        
        // Kill Chrome
        try {
          execSync('taskkill /F /IM chrome.exe /T 2>&1', { stdio: 'pipe' });
          this.fixes.push('killed_chrome');
        } catch (e) {}
        
        // Kill Edge
        try {
          execSync('taskkill /F /IM msedge.exe /T 2>&1', { stdio: 'pipe' });
          this.fixes.push('killed_edge');
        } catch (e) {}
        
        // Clear temp files
        this.clearTempFiles();
      }
    } catch (e) {
      log(`Error healing memory: ${e.message}`);
    }
  }

  async healDisk() {
    try {
      const diskInfo = this.checkDiskSpace();
      
      for (const drive of diskInfo.drives || []) {
        if (drive.freeGB < 5) {
          log(`🔴 Disk ${drive.drive} low (${drive.freeGB}GB free), cleaning...`);
          
          // Clean logs
          this.cleanOldLogs();
          
          // Clean temp
          this.clearTempFiles();
          
          this.fixes.push(`cleaned_disk_${drive.drive}`);
        }
      }
    } catch (e) {
      log(`Error healing disk: ${e.message}`);
    }
  }

  async healConfig() {
    try {
      const configPath = 'C:\\Users\\quent\\.openclaw\\openclaw.json';
      
      // Check if config is valid JSON
      try {
        JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) {
        log('🔴 Config corrupted, restoring from backup...');
        
        // Find latest backup
        const backups = fs.readdirSync('C:\\Users\\quent\\.openclaw')
          .filter(f => f.startsWith('openclaw.json.backup.'))
          .sort()
          .reverse();
        
        if (backups.length > 0) {
          fs.copyFileSync(
            path.join('C:\\Users\\quent\\.openclaw', backups[0]),
            configPath
          );
          this.fixes.push('restored_config_from_backup');
        }
      }
    } catch (e) {
      log(`Error healing config: ${e.message}`);
    }
  }

  async healLogs() {
    try {
      const logsDir = 'C:\\Users\\quent\\.openclaw\\logs';
      
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir);
        const totalSize = files.reduce((sum, f) => {
          try {
            return sum + fs.statSync(path.join(logsDir, f)).size;
          } catch (e) {
            return sum;
          }
        }, 0);
        
        // If logs > 500MB, clean old ones
        if (totalSize > 500 * 1024 * 1024) {
          log('🔴 Logs too large, cleaning old files...');
          
          const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
          let cleaned = 0;
          
          for (const file of files) {
            const filePath = path.join(logsDir, file);
            try {
              const stat = fs.statSync(filePath);
              if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(filePath);
                cleaned++;
              }
            } catch (e) {}
          }
          
          this.fixes.push(`cleaned_${cleaned}_old_logs`);
        }
      }
    } catch (e) {
      log(`Error healing logs: ${e.message}`);
    }
  }

  checkMemory() {
    try {
      const output = execSync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', { encoding: 'utf8' });
      const lines = output.split('\n');
      let total = 0, free = 0;
      
      for (const line of lines) {
        if (line.includes('TotalVisibleMemorySize')) total = parseInt(line.split('=')[1]) * 1024;
        if (line.includes('FreePhysicalMemory')) free = parseInt(line.split('=')[1]) * 1024;
      }
      
      const used = total - free;
      return {
        totalGB: Math.round(total / (1024**3)),
        freeGB: Math.round(free / (1024**3)),
        percentUsed: Math.round((used / total) * 100)
      };
    } catch (e) {
      return { percentUsed: 0 };
    }
  }

  checkDiskSpace() {
    try {
      const output = execSync('wmic logicaldisk get size,freespace,caption /value', { encoding: 'utf8' });
      const drives = [];
      const sections = output.split('\n\n');
      
      for (const section of sections) {
        const caption = section.match(/Caption=(.+)/)?.[1]?.trim();
        const size = section.match(/Size=(\d+)/)?.[1];
        const free = section.match(/FreeSpace=(\d+)/)?.[1];
        
        if (caption && size && free) {
          drives.push({
            drive: caption,
            totalGB: Math.round(parseInt(size) / (1024**3)),
            freeGB: Math.round(parseInt(free) / (1024**3))
          });
        }
      }
      
      return { drives };
    } catch (e) {
      return { drives: [] };
    }
  }

  clearTempFiles() {
    const tempDir = 'C:\\Users\\quent\\AppData\\Local\\Temp';
    let cleaned = 0;
    
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir).slice(0, 100); // Limit to 100 files
        for (const file of files) {
          try {
            const filePath = path.join(tempDir, file);
            const stat = fs.statSync(filePath);
            
            // Delete files older than 1 day
            if (Date.now() - stat.mtimeMs > 86400000) {
              if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(filePath);
              }
              cleaned++;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    
    if (cleaned > 0) {
      this.fixes.push(`cleared_${cleaned}_temp_files`);
    }
  }

  cleanOldLogs() {
    const logsDir = 'C:\\Users\\quent\\.openclaw\\logs';
    let cleaned = 0;
    
    try {
      if (fs.existsSync(logsDir)) {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const files = fs.readdirSync(logsDir);
        
        for (const file of files) {
          try {
            const filePath = path.join(logsDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.mtimeMs < cutoff) {
              fs.unlinkSync(filePath);
              cleaned++;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    
    if (cleaned > 0) {
      this.fixes.push(`cleaned_${cleaned}_old_logs`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const healer = new SelfHealer();
  healer.run().then(results => {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = SelfHealer;
