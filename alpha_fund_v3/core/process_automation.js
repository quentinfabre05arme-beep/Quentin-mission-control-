#!/usr/bin/env node
/**
 * 🔄 PROCESS AUTOMATION
 * Start, stop, monitor, prioritize processes
 */

const { execSync } = require('child_process');
const fs = require('fs');

// ─── LIST ─────────────────────────────────────────────────
function list(filter = '') {
  try {
    const cmd = filter 
      ? `Get-Process | Where-Object { $_.ProcessName -like '*${filter}*' } | Select-Object Id, ProcessName, WorkingSet64 | ConvertTo-Json`
      : `Get-Process | Select-Object Id, ProcessName, WorkingSet64 | ConvertTo-Json`;
    
    const result = execSync(
      `powershell -c "${cmd}"`,
      { encoding: 'utf8', timeout: 10000, windowsHide: true }
    );
    
    const data = JSON.parse(result);
    const processes = Array.isArray(data) ? data : [data];
    return processes.map(p => ({
      id: p.Id,
      name: p.ProcessName,
      ram_mb: Math.round(p.WorkingSet64 / 1024 / 1024)
    }));
  } catch(e) {
    return [];
  }
}

// ─── START ────────────────────────────────────────────────
function start(command, args = [], options = {}) {
  try {
    const { spawn } = require('child_process');
    const child = spawn(command, args, {
      detached: options.detached || false,
      windowsHide: options.visible ? false : true,
      stdio: options.stdio || 'ignore'
    });
    
    if (options.detached) child.unref();
    
    return { success: true, pid: child.pid };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── KILL ─────────────────────────────────────────────────
function kill(pidOrName) {
  try {
    if (typeof pidOrName === 'number') {
      execSync(`taskkill /F /PID ${pidOrName}`, { windowsHide: true });
    } else {
      execSync(`taskkill /F /IM ${pidOrName}`, { windowsHide: true });
    }
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── SET PRIORITY ─────────────────────────────────────────
function setPriority(pid, priority) {
  try {
    execSync(
      `powershell -c "(Get-Process -Id ${pid}).PriorityClass = [System.Diagnostics.ProcessPriorityClass]::${priority}"`,
      { windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { list, start, kill, setPriority };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🔄 Process Automation');
  console.log('');
  
  console.log('Node processes:');
  const processes = list('node');
  processes.slice(0, 5).forEach(p => {
    console.log(`  PID ${p.id}: ${p.name} (${p.ram_mb}MB)`);
  });
  
  console.log('');
  console.log('Process automation ready');
}
