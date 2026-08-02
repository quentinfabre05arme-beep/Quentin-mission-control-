/**
 * PROJECT CLAW CORE — Phone Bridge
 * Bridge to phone via ADB or local network.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'phone_bridge.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class PhoneBridge {
  listDevices() {
    log('Listing ADB devices');
    try {
      const output = execSync('adb devices', { encoding: 'utf8', windowsHide: true, timeout: 15000 });
      const lines = output.trim().split('\n').slice(1);
      return { success: true, devices: lines.map(l => l.split('\t')[0]).filter(Boolean) };
    } catch(e) {
      return { success: false, error: e.message, note: 'ADB not installed or no phone connected' };
    }
  }
  
  sendSMS(number, message) {
    log(`Send SMS to ${number}`);
    return { success: false, error: 'SMS sending requires ADB + phone permissions. Not implemented.' };
  }
}

module.exports = { PhoneBridge };

if (require.main === module) {
  const pb = new PhoneBridge();
  console.log(JSON.stringify(pb.listDevices(), null, 2));
}
