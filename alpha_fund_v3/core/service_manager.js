const { execSync } = require('child_process');

function listServices() {
  try {
    const result = execSync('sc query type= service state= all', { encoding: 'utf8', windowsHide: true });
    return result.split('SERVICE_NAME:').slice(1).map(s => s.split('\n')[0].trim()).filter(Boolean);
  } catch(e) { return []; }
}

function startService(name) {
  try { execSync(`sc start ${name}`, { windowsHide: true }); return { success: true }; }
  catch(e) { return { error: e.message }; }
}

function stopService(name) {
  try { execSync(`sc stop ${name}`, { windowsHide: true }); return { success: true }; }
  catch(e) { return { error: e.message }; }
}

module.exports = { listServices, startService, stopService };