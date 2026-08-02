/**
 * PROJECT CLAW CORE — Video Editor Agent
 * Basic video operations via ffmpeg.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'video_editor_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class VideoEditorAgent {
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
  
  getInfo(filePath) {
    log(`Getting video info: ${filePath}`);
    if (!this.ffmpegAvailable) return { success: false, error: 'ffmpeg not installed' };
    try {
      const output = execSync(`ffprobe -v quiet -print_format json -show_streams "${filePath}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, info: JSON.parse(output) };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  trim(inputPath, outputPath, start, duration) {
    log(`Trimming video: ${inputPath}`);
    if (!this.ffmpegAvailable) return { success: false, error: 'ffmpeg not installed' };
    try {
      execSync(`ffmpeg -i "${inputPath}" -ss ${start} -t ${duration} -c copy -y "${outputPath}"`, {
        windowsHide: true,
        timeout: 60000
      });
      return { success: fs.existsSync(outputPath), path: outputPath };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { VideoEditorAgent };

if (require.main === module) {
  const editor = new VideoEditorAgent();
  console.log(JSON.stringify({ ffmpeg_available: editor.ffmpegAvailable }, null, 2));
}
