/**
 * PROJECT CLAW CORE — Scheduler Agent
 * Schedule Windows tasks via Task Scheduler.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'scheduler_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[c]);
}

class SchedulerAgent {
  listTasks(folder = '') {
    log(`Listing tasks in ${folder || 'root'}`);
    try {
      const cmd = folder ? `schtasks /query /fo CSV /tn "${folder}"` : 'schtasks /query /fo CSV';
      const output = execSync(cmd, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message, output: e.stdout || '' };
    }
  }
  
  createTaskXml(name, command, schedule) {
    log(`Creating task ${name}`);
    const xmlPath = path.join(process.env.TEMP || '.', `${name}.xml`);
    
    const trigger = schedule.daily ? `
      <CalendarTrigger>
        <StartBoundary>${new Date().toISOString().split('.')[0]}</StartBoundary>
        <ScheduleByDay>
          <DaysInterval>1</DaysInterval>
        </ScheduleByDay>
      </CalendarTrigger>
    ` : schedule.minutes ? `
      <TimeTrigger>
        <Repetition>
          <Interval>PT${schedule.minutes}M</Interval>
          <Duration>P1D</Duration>
        </Repetition>
        <StartBoundary>${new Date().toISOString().split('.')[0]}</StartBoundary>
      </TimeTrigger>
    ` : `
      <BootTrigger>
        <Delay>PT1M</Delay>
      </BootTrigger>
    `;
    
    const xml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>${escapeXml(schedule.description || `Claw scheduled task: ${name}`)}</Description>
  </RegistrationInfo>
  <Triggers>
    ${trigger}
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${escapeXml(command)}</Command>
    </Exec>
  </Actions>
</Task>`;
    
    fs.writeFileSync(xmlPath, xml, 'utf16le');
    return xmlPath;
  }
  
  create(name, command, schedule = {}) {
    const xmlPath = this.createTaskXml(name, command, schedule);
    try {
      const output = execSync(`schtasks /create /tn "${name}" /xml "${xmlPath}" /f`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    } finally {
      try { fs.unlinkSync(xmlPath); } catch(e) {}
    }
  }
  
  delete(name) {
    try {
      const output = execSync(`schtasks /delete /tn "${name}" /f`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  run(name) {
    try {
      const output = execSync(`schtasks /run /tn "${name}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { SchedulerAgent };

if (require.main === module) {
  const agent = new SchedulerAgent();
  console.log(agent.listTasks('\\'));
}
