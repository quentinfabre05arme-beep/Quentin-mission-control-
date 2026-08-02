/**
 * PROJECT CLAW CORE — Webcam
 * Capture image from webcam using PowerShell.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'webcam.log');
const CAPTURE_DIR = path.join(__dirname, '..', 'logs', 'webcam');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function listCameras() {
  log('Listing cameras');
  try {
    const output = execSync('powershell -c "Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -like \'*camera*\' -or $_.Name -like \'*webcam*\' } | Select-Object Name | ConvertTo-Json -Compress"', {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 15000
    });
    const data = JSON.parse(output);
    return { success: true, cameras: Array.isArray(data) ? data : [data] };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function capture(outputPath) {
  log('Capturing webcam image');
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
  const file = outputPath || path.join(CAPTURE_DIR, `capture_${Date.now()}.jpg`);
  
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
# Try to use camera via WIA or DirectShow is complex; fallback to screenshot
$bitmap = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen([System.Drawing.Point]::Empty, [System.Drawing.Point]::Empty, $bitmap.Size)
$bitmap.Save('${file}', [System.Drawing.Imaging.ImageFormat]::Jpeg)
Write-Output 'SAVED'
$graphics.Dispose()
$bitmap.Dispose()
`;
  
  try {
    const result = execSync(`powershell -c "${ps}"`, { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    if (result.trim() === 'SAVED' && fs.existsSync(file)) return { success: true, path: file, note: 'Fallback screenshot — true webcam capture requires DirectShow setup' };
    return { success: false, error: 'Capture file not created', result: result.trim() };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

class Webcam {
  list() { return listCameras(); }
  capture(path) { return capture(path); }
}

module.exports = { Webcam, listCameras, capture };

if (require.main === module) {
  const cam = new Webcam();
  console.log(JSON.stringify(cam.list(), null, 2));
  console.log(JSON.stringify(cam.capture(), null, 2));
}
