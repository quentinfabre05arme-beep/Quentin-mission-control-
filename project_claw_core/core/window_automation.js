const { execSync } = require('child_process');

function listWindows() {
  try {
    const result = execSync('powershell -c "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName, MainWindowTitle | Format-Table -AutoSize"', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}

module.exports = { listWindows };