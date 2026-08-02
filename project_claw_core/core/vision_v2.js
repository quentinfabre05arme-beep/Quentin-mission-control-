/**
 * PROJECT CLAW CORE — Vision v2
 * Screen capture + OCR using Tesseract.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'vision_v2.log');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'logs', 'screenshots');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function captureScreenshot(outputPath) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = outputPath || path.join(SCREENSHOT_DIR, `screen_${Date.now()}.png`);
  
  log(`Capturing screenshot: ${file}`);
  try {
    const psFile = path.join(process.env.TEMP || '.', `claw_screenshot_${Date.now()}.ps1`);
    const ps = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('${file}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()`;
    
    fs.writeFileSync(psFile, ps);
    execSync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { windowsHide: true, timeout: 15000 });
    fs.unlinkSync(psFile);
    
    if (!fs.existsSync(file)) throw new Error('Screenshot file not created');
    return { success: true, path: file };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function ocrImage(imagePath) {
  log(`OCR: ${imagePath}`);
  try {
    const tesseractPath = '"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"';
    const result = execSync(`${tesseractPath} "${imagePath}" stdout -l eng`, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000
    });
    return { success: true, text: result.trim() };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function findTextOnScreen(targetText) {
  const shot = captureScreenshot();
  if (!shot.success) return shot;
  
  const ocr = ocrImage(shot.path);
  if (!ocr.success) return ocr;
  
  const found = ocr.text.toLowerCase().includes(targetText.toLowerCase());
  return { success: true, found, text: ocr.text, screenshot: shot.path };
}

module.exports = { captureScreenshot, ocrImage, findTextOnScreen };

if (require.main === module) {
  const result = captureScreenshot();
  if (result.success) {
    const text = ocrImage(result.path);
    console.log(JSON.stringify(text, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}
