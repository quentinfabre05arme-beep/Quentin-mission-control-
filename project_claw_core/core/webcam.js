const { execSync } = require('child_process');

function captureWebcam(outputPath) {
  try {
    execSync(`ffmpeg -f dshow -i video="Integrated Webcam" -frames:v 1 "${outputPath}"`, { windowsHide: true, timeout: 10000 });
    return { success: true, path: outputPath };
  } catch(e) {
    return { error: e.message }; }
}

module.exports = { captureWebcam };