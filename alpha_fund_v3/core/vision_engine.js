#!/usr/bin/env node
/**
 * 👁️ VISION ENGINE
 * Screenshot capture + OCR + vision analysis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VISION_DIR = path.join(__dirname, '..', 'vision');

// ─── SCREENSHOT ───────────────────────────────────────────
function screenshot(filename = null) {
  const fp = filename || path.join(VISION_DIR, `screen_${Date.now()}.png`);
  fs.mkdirSync(VISION_DIR, { recursive: true });
  
  try {
    execSync(
      `python -c "import pyautogui; pyautogui.screenshot(r'${fp.replace(/\\/g, '\\\\')}')"`,
      { timeout: 10000, windowsHide: true }
    );
    return { success: true, path: fp, size: fs.existsSync(fp) ? fs.statSync(fp).size : 0 };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── OCR (Text from image) ────────────────────────────────
function ocr(imagePath) {
  const tesseractPath = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
  
  if (!fs.existsSync(tesseractPath)) {
    return { error: 'Tesseract not found at ' + tesseractPath };
  }
  
  try {
    if (!fs.existsSync(imagePath)) return { error: 'Image not found' };
    
    const result = execSync(
      `"${tesseractPath}" "${imagePath}" stdout`,
      { encoding: 'utf8', timeout: 30000, windowsHide: true }
    );
    
    return { success: true, text: result.trim() };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── CAPTURE + OCR ────────────────────────────────────────
function captureAndRead() {
  const ss = screenshot();
  if (!ss.success) return ss;
  
  const text = ocr(ss.path);
  return {
    success: text.success,
    path: ss.path,
    text: text.text || '',
    size: ss.size
  };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { screenshot, ocr, captureAndRead };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('👁️ Vision Engine v1.0');
  console.log('');
  
  console.log('Taking screenshot...');
  const ss = screenshot(path.join(VISION_DIR, 'test.png'));
  console.log(ss.success ? `✅ Screenshot: ${Math.round(ss.size/1024)}KB` : '❌ ' + ss.error);
  
  if (ss.success) {
    console.log('');
    console.log('Running OCR...');
    const text = ocr(ss.path);
    console.log(text.success ? `✅ OCR: ${text.text?.substring(0, 100) || 'No text found'}...` : '❌ ' + text.error);
  }
  
  console.log('');
  console.log('Vision engine ready');
}
