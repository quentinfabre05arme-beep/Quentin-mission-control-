const { execSync } = require('child_process');

function getDiskInfo() {
  try {
    const result = execSync('wmic logicaldisk get DeviceID,Size,FreeSpace', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}

function getDiskUsage() {
  try {
    const result = execSync('wmic logicaldisk get DeviceID,Size,FreeSpace,Description /format:csv', { encoding: 'utf8', windowsHide: true });
    const lines = result.split('\n').filter(l => l.includes(','));
    return lines.slice(1).map(l => {
      const parts = l.split(',');
      return { device: parts[1], size: parts[2], free: parts[3] };
    });
  } catch(e) { return []; }
}

module.exports = { getDiskInfo, getDiskUsage };