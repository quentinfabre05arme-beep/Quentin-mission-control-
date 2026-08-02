const { execSync } = require('child_process');

function compress(source, dest) {
  try {
    execSync(`powershell -c "Compress-Archive -Path '${source}' -DestinationPath '${dest}' -Force"`, { windowsHide: true, timeout: 120000 });
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function extract(source, dest) {
  try {
    execSync(`powershell -c "Expand-Archive -Path '${source}' -DestinationPath '${dest}' -Force"`, { windowsHide: true, timeout: 120000 });
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

module.exports = { compress, extract };