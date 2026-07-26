/**
 * Health Monitor
 * Monitor system health without process access
 */

const fs = require('fs');
const path = require('path');

const HEALTH_LOG = path.join(__dirname, '..', '..', 'logs', 'health_monitor.jsonl');

class HealthMonitor {
  constructor() {
    this.checks = [];
    this.alerts = [];
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync('C:\\');
      // Approximate free space check
      const info = {
        type: 'disk',
        timestamp: new Date().toISOString(),
        status: 'ok'
      };
      this.logCheck(info);
      return info;
    } catch (e) {
      return { type: 'disk', status: 'error', error: e.message };
    }
  }

  checkFileSystem() {
    const checks = [];
    
    // Check workspace accessibility
    try {
      const files = fs.readdirSync('.');
      checks.push({ type: 'workspace', status: 'ok', files: files.length });
    } catch (e) {
      checks.push({ type: 'workspace', status: 'error', error: e.message });
    }
    
    // Check git repo
    try {
      const gitExists = fs.existsSync('.git');
      checks.push({ type: 'git', status: gitExists ? 'ok' : 'missing' });
    } catch (e) {
      checks.push({ type: 'git', status: 'error' });
    }
    
    // Check logs directory
    try {
      const logsDir = path.join('..', '..', 'logs');
      const logsExist = fs.existsSync(logsDir);
      checks.push({ type: 'logs', status: logsExist ? 'ok' : 'missing' });
    } catch (e) {
      checks.push({ type: 'logs', status: 'error' });
    }
    
    for (const check of checks) {
      this.logCheck(check);
    }
    
    return checks;
  }

  checkSkills() {
    try {
      const skillsDir = path.join(__dirname, '..', '..', 'skills');
      const skills = fs.readdirSync(skillsDir)
        .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
      
      return {
        type: 'skills',
        status: 'ok',
        count: skills.length,
        skills: skills
      };
    } catch (e) {
      return { type: 'skills', status: 'error', error: e.message };
    }
  }

  runAllChecks() {
    return {
      disk: this.checkDiskSpace(),
      filesystem: this.checkFileSystem(),
      skills: this.checkSkills(),
      timestamp: new Date().toISOString()
    };
  }

  logCheck(check) {
    fs.appendFileSync(HEALTH_LOG, JSON.stringify(check) + '\n');
  }

  getAlerts() {
    return this.alerts;
  }

  clearAlerts() {
    this.alerts = [];
  }
}

module.exports = HealthMonitor;
