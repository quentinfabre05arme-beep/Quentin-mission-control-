const { execSync } = require('child_process');

function recordAudio(outputPath, seconds) {
  try {
    execSync(`ffmpeg -f dshow -i audio="Microphone" -t ${seconds} "${outputPath}"`, { windowsHide: true, timeout: (seconds + 5) * 1000 });
    return { success: true, path: outputPath };
  } catch(e) { return { error: e.message }; }
}

module.exports = { recordAudio };