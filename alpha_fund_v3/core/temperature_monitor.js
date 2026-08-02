const { execSync } = require('child_process');

function getTemperatures() {
  try {
    const result = execSync('wmic /namespace:\\root\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}

module.exports = { getTemperatures };