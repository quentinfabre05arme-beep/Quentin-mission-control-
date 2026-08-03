/**
 * PROCESS LOCK v1.0
 * Simple PID-based single-instance lock for long-running Node processes.
 */

const fs = require('fs');
const path = require('path');

function acquire(lockPath, { silent = false } = {}) {
  const dir = path.dirname(lockPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(lockPath)) {
      const oldPid = parseInt(fs.readFileSync(lockPath, 'utf8'), 10);
      if (oldPid && oldPid !== process.pid) {
        try {
          process.kill(oldPid, 0); // throws if process is dead
          if (!silent) console.error(`Lock held by running process ${oldPid}. Exiting.`);
          return false;
        } catch (e) {
          // old process is dead; overwrite lock below
        }
      }
    }
    fs.writeFileSync(lockPath, String(process.pid));

    const release = () => {
      try {
        if (fs.existsSync(lockPath) && fs.readFileSync(lockPath, 'utf8') === String(process.pid)) {
          fs.unlinkSync(lockPath);
        }
      } catch (e) {}
    };

    process.on('exit', release);
    process.on('SIGINT', () => { release(); process.exit(0); });
    process.on('SIGTERM', () => { release(); process.exit(0); });
    return true;
  } catch (e) {
    if (!silent) console.error(`Lock error: ${e.message}`);
    return false;
  }
}

module.exports = { acquire };
