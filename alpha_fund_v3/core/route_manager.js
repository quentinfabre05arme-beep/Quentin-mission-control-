const { execSync } = require('child_process');
function getRoutes() {
  try {
    const result = execSync('route print', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}
module.exports = { getRoutes };
