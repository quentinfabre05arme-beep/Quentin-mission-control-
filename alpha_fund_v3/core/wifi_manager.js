const { execSync } = require('child_process');

function listNetworks() {
  try {
    const result = execSync('netsh wlan show profiles', { encoding: 'utf8', windowsHide: true });
    return result.split('
').filter(l => l.includes(':')).map(l => l.split(':')[1]?.trim()).filter(Boolean);
  } catch(e) { return []; }
}

function getConnectedNetwork() {
  try {
    const result = execSync('netsh wlan show interfaces', { encoding: 'utf8', windowsHide: true });
    const match = result.match(/SSIDs+:s(.+)/);
    return match ? match[1].trim() : null;
  } catch(e) { return null; }
}

module.exports = { listNetworks, getConnectedNetwork };