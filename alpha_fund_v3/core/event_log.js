const { execSync } = require('child_process');

function getEventLog(count = 10) {
  try {
    const result = execSync(`powershell -c "Get-EventLog -LogName System -Newest ${count} | Select-Object TimeGenerated, EntryType, Source, Message | Format-Table -AutoSize"`, { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}

module.exports = { getEventLog };