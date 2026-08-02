const { execSync } = require('child_process');
const fs = require('fs');

function backupDir(source, dest) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${dest}/backup_${timestamp}`;
    fs.mkdirSync(backupPath, { recursive: true });
    execSync(`robocopy "${source}" "${backupPath}" /MIR /NFL /NDL /NJH /NJS`, { windowsHide: true, timeout: 300000 });
    return { success: true, path: backupPath };
  } catch(e) { return { error: e.message }; }
}

module.exports = { backupDir };