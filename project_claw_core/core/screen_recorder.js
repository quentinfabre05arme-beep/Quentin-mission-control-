/**
 * PROJECT CLAW CORE — Screen Recorder
 * Record screen using ffmpeg.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'screen_recorder.log');
const RECORD_DIR = path.join(__dirname, '..', 'logs', 'screen_recordings');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ScreenRecorder {
  constructor() {
    this.ffmpegAvailable = this.checkFfmpeg();
  }
  
  checkFfmpeg() {
    try {
      execSync('ffmpeg -version', { windowsHide: true, timeout: 5000 });
      return true;
    } catch(e) {
      return false;
    }
  }
  
  record(durationSeconds = 10, outputPath) {
    log(`Recording screen for ${durationSeconds}s`);
    fs.mkdirSync(RECORD_DIR, { recursive: true });
    const file = outputPath || path.join(RECORD_DIR, `screen_${Date.now()}.mp4`);
    
    if (!this.ffmpegAvailable) {
      return { success: false, error: 'ffmpeg not installed' };
    }
    
    try {
      // Windows: record desktop using gdigrab
      execSync(`ffmpeg -f gdigrab -framerate 10 -video_size 1920x1080 -i desktop -t ${durationSeconds} -pix_fmt yuv420p "${file}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: durationSeconds * 1000 + 20000
      });
      if (fs.existsSync(file)) return { success: true, path: file, size: fs.statSync(file).size };
    } catch(e) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'Could not record screen' };
  }
}

module.exports = { ScreenRecorder };

if (require.main === module) {
  const recorder = new ScreenRecorder();
  console.log(JSON.stringify({ ffmpeg_available: recorder.ffmpegAvailable }, null, 2));
}
