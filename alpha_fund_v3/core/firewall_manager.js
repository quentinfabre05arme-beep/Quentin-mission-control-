
const { execSync } = require('child_process');

function getFirewallStatus() {
  try {
    const result = execSync('netsh advfirewall show currentprofile', { encoding: 'utf8', windowsHide: true });
    return { status: result.includes('ON') ? 'ON' : 'OFF', raw: result };
  } catch(e) { return { error: e.message }; }
}

module.exports = { getFirewallStatus };
