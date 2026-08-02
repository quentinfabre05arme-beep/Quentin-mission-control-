/**
 * PROJECT CLAW CORE — Microphone
 * List microphone devices and record via ffmpeg.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'microphone.log');
const RECORD_DIR = path.join(__dirname, '..', 'logs', 'microphone');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function listMicrophones() {
  log('Listing microphones');
  try {
    const output = execSync(`powershell -c "Get-CimInstance Win32_SoundDevice | Select-Object Name,Status | ConvertTo-Json -Compress"`, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 15000
    });
    const data = JSON.parse(output);
    return { success: true, devices: Array.isArray(data) ? data : [data] };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function record(durationSeconds = 5, outputPath) {
  log(`Recording microphone for ${durationSeconds}s`);
  fs.mkdirSync(RECORD_DIR, { recursive: true });
  const file = outputPath || path.join(RECORD_DIR, `recording_${Date.now()}.wav`);
  try {
    execSync(`ffmpeg -f dshow -i audio="Microphone" -t ${durationSeconds} -y "${file}"`, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: durationSeconds * 1000 + 10000
    });
    if (fs.existsSync(file)) return { success: true, path: file, size: fs.statSync(file).size };
  } catch(e) {
    return { success: false, error: e.message };
  }
  return { success: false, error: 'Could not record microphone' };
}

class Microphone {
  list() { return listMicrophones(); }
  record(duration, path) { return record(duration, path); }
}

module.exports = { Microphone, listMicrophones, record };

if (require.main === module) {
  const mic = new Microphone();
  console.log(JSON.stringify(mic.list(), null, 2));
}
