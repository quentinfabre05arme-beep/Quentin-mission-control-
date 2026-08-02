const os = require('os');
function getMemoryMap() {
  return {
    total: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
    free: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
    used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024) + 'GB'
  };
}
module.exports = { getMemoryMap };
