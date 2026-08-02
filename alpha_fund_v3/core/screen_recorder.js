#!/usr/bin/env node
/**
 * 📹 SCREEN RECORDER
 * Record screen to video file using ffmpeg
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VIDEO_DIR = path.join(__dirname, '..', 'video');

// ─── CHECK FFMPEG ─────────────────────────────────────────
function hasFFmpeg() {
  try {
    execSync('ffmpeg -version', { timeout: 5000, windowsHide: true });
    return true;
  } catch(e) {
    return false;
  }
}

// ─── RECORD SCREEN ────────────────────────────────────────
function recordScreen(duration = 10, filename = null) {
  if (!hasFFmpeg()) {
    return { error: 'ffmpeg not installed', install: 'winget install Gyan.FFmpeg' };
  }
  
  const fp = filename || path.join(VIDEO_DIR, `screen_${Date.now()}.mp4`);
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  
  try {
    // Windows screen capture with ffmpeg
    execSync(
      `ffmpeg -f gdigrab -framerate 30 -i desktop -t ${duration} -pix_fmt yuv420p -c:v libx264 -preset fast "${fp}" -y`,
      { timeout: (duration + 10) * 1000, windowsHide: true }
    );
    return { success: true, path: fp, duration };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── RECORD REGION ────────────────────────────────────────
function recordRegion(x, y, width, height, duration = 10, filename = null) {
  if (!hasFFmpeg()) {
    return { error: 'ffmpeg not installed' };
  }
  
  const fp = filename || path.join(VIDEO_DIR, `region_${Date.now()}.mp4`);
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  
  try {
    execSync(
      `ffmpeg -f gdigrab -framerate 30 -offset_x ${x} -offset_y ${y} -video_size ${width}x${height} -i desktop -t ${duration} -pix_fmt yuv420p -c:v libx264 "${fp}" -y`,
      { timeout: (duration + 10) * 1000, windowsHide: true }
    );
    return { success: true, path: fp, duration, region: { x, y, width, height } };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── LIST VIDEOS ──────────────────────────────────────────
function listVideos() {
  if (!fs.existsSync(VIDEO_DIR)) return [];
  return fs.readdirSync(VIDEO_DIR)
    .filter(f => f.endsWith('.mp4'))
    .map(f => ({
      name: f,
      path: path.join(VIDEO_DIR, f),
      size: fs.statSync(path.join(VIDEO_DIR, f)).size,
      created: fs.statSync(path.join(VIDEO_DIR, f)).birthtime
    }));
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { hasFFmpeg, recordScreen, recordRegion, listVideos };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('📹 Screen Recorder');
  console.log('');
  
  console.log('ffmpeg:', hasFFmpeg() ? '✅' : '❌ (install with: winget install Gyan.FFmpeg)');
  console.log('');
  
  if (hasFFmpeg()) {
    console.log('Recording 3-second test...');
    const result = recordScreen(3, path.join(VIDEO_DIR, 'test.mp4'));
    console.log(result.success ? `✅ Saved: ${result.path}` : '❌ ' + result.error);
  }
  
  console.log('');
  console.log('Videos:', listVideos().length);
  console.log('Screen recorder ready');
}
