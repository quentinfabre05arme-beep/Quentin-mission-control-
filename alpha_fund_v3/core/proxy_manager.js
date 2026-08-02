const { execSync } = require('child_process');
function getProxy() {
  try {
    const result = execSync('reg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\" /v ProxyEnable', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}
module.exports = { getProxy };
