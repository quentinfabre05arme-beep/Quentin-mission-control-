/**
 * PROJECT CLAW CORE — Clipboard OCR Agent
 * Read clipboard text or image, OCR if image.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { captureScreenshot, ocrImage } = require('./vision_v2');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'clipboard_ocr_agent.log');
const TEMP_DIR = path.join(__dirname, '..', 'logs', 'clipboard');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function readClipboardText() {
  log('Reading text from clipboard');
  try {
    const text = execSync('powershell -c "Get-Clipboard"', {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000
    });
    return { type: 'text', content: text.trim() };
  } catch(e) {
    return { type: 'text', content: '', error: e.message };
  }
}

function saveClipboardImage() {
  log('Saving clipboard image');
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const file = path.join(TEMP_DIR, `clip_${Date.now()}.png`);
  
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img) {
  $img.Save('${file}', [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output 'SAVED'
} else {
  Write-Output 'NO_IMAGE'
}
`;
  
  try {
    const result = execSync(`powershell -c "${ps}"`, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 15000
    });
    if (result.trim() === 'SAVED' && fs.existsSync(file)) {
      return { type: 'image', path: file };
    }
    return { type: 'none', content: 'No image in clipboard' };
  } catch(e) {
    return { type: 'error', error: e.message };
  }
}

async function readClipboard() {
  // First try text
  const textResult = readClipboardText();
  if (textResult.content) return textResult;
  
  // Then try image
  const imageResult = saveClipboardImage();
  if (imageResult.type === 'image') {
    const ocr = await ocrImage(imageResult.path);
    return {
      type: 'image',
      path: imageResult.path,
      text: ocr.success ? ocr.text : '',
      ocrError: ocr.success ? undefined : ocr.error
    };
  }
  
  return imageResult;
}

class ClipboardOcrAgent {
  async read() {
    return await readClipboard();
  }
}

module.exports = { ClipboardOcrAgent, readClipboard, readClipboardText, saveClipboardImage };

if (require.main === module) {
  (async () => {
    const result = await readClipboard();
    console.log(JSON.stringify(result, null, 2));
  })();
}
