const { execSync } = require('child_process');

function getDNS() {
  try {
    const result = execSync('ipconfig /all', { encoding: 'utf8', windowsHide: true });
    const lines = result.split('
').filter(l => l.includes('DNS Servers'));
    return lines.map(l => l.split(':')[1]?.trim()).filter(Boolean);
  } catch(e) { return []; }
}

function flushDNS() {
  try {
    execSync('ipconfig /flushdns', { windowsHide: true });
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

module.exports = { getDNS, flushDNS };