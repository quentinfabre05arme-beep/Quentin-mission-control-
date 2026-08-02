const { execSync } = require('child_process');
function getBIOS() {
  try {
    const result = execSync('wmic bios get Manufacturer, Name, Version', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}
module.exports = { getBIOS };
