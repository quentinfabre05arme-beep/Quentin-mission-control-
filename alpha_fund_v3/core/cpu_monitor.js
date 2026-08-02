const os = require('os');
function getCPUInfo() {
  return {
    model: os.cpus()[0].model,
    cores: os.cpus().length,
    speed: os.cpus()[0].speed + 'MHz'
  };
}
module.exports = { getCPUInfo };
