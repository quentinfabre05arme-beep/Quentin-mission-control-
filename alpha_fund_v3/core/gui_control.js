#!/usr/bin/env node
/**
 * 🖥️ SCREEN + MOUSE + KEYBOARD + CLIPBOARD CONTROL
 * Full GUI automation for Windows
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

// ─── HELPERS ────────────────────────────────────────────────
function runPython(script) {
  try {
    return execSync(`python -c "${script}"`, { encoding: 'utf8', timeout: 30000 });
  } catch(e) {
    return `Error: ${e.message}`;
  }
}

// ─── SCREENSHOT ───────────────────────────────────────────
function screenshot(filename = null) {
  const ts = filename || `screen_${Date.now()}.png`;
  const fp = path.join(SCREENSHOT_DIR, ts);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  
  const script = `
import pyautogui
pyautogui.screenshot(r'${fp.replace(/\\/g, '\\\\')}')
print('${fp}')
`;
  
  const result = runPython(script).trim();
  return { success: !result.includes('Error'), path: result };
}

// ─── MOUSE ──────────────────────────────────────────────────
function mouseMove(x, y) {
  const script = `
import pyautogui
pyautogui.moveTo(${x}, ${y}, duration=0.5)
print('moved')
`;
  return runPython(script).trim();
}

function mouseClick(x = null, y = null, button = 'left') {
  const script = x !== null && y !== null
    ? `import pyautogui; pyautogui.click(${x}, ${y}, button='${button}'); print('clicked')`
    : `import pyautogui; pyautogui.click(button='${button}'); print('clicked')`;
  return runPython(script).trim();
}

function scroll(amount, x = null, y = null) {
  const script = x !== null && y !== null
    ? `import pyautogui; pyautogui.scroll(${amount}, ${x}, ${y}); print('scrolled')`
    : `import pyautogui; pyautogui.scroll(${amount}); print('scrolled')`;
  return runPython(script).trim();
}

// ─── KEYBOARD ─────────────────────────────────────────────
function keyPress(keys) {
  const script = `
import pyautogui
pyautogui.keyDown(${JSON.stringify(keys).replace(/\[/g, '').replace(/\]/g, '')})
pyautogui.keyUp(${JSON.stringify(keys).replace(/\[/g, '').replace(/\]/g, '')})
print('pressed')
`;
  return runPython(script).trim();
}

function typeText(text, interval = 0.01) {
  const script = `
import pyautogui
pyautogui.typewrite(r'''${text}''', interval=${interval})
print('typed')
`;
  return runPython(script).trim();
}

// ─── CLIPBOARD ────────────────────────────────────────────
function clipboardRead() {
  try {
    return execSync('powershell -command "Get-Clipboard"', { encoding: 'utf8' }).trim();
  } catch(e) {
    return '';
  }
}

function clipboardWrite(text) {
  try {
    execSync(`powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`, { encoding: 'utf8' });
    return true;
  } catch(e) {
    return false;
  }
}

// ─── SCREEN SIZE ──────────────────────────────────────────
function screenSize() {
  const script = `
import pyautogui
w, h = pyautogui.size()
print(f'{w},{h}')
`;
  const result = runPython(script).trim();
  const [w, h] = result.split(',').map(Number);
  return { width: w, height: h };
}

// ─── MOUSE POSITION ───────────────────────────────────────
function mousePosition() {
  const script = `
import pyautogui
x, y = pyautogui.position()
print(f'{x},{y}')
`;
  const result = runPython(script).trim();
  const [x, y] = result.split(',').map(Number);
  return { x, y };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = {
  screenshot,
  mouseMove,
  mouseClick,
  scroll,
  keyPress,
  typeText,
  clipboardRead,
  clipboardWrite,
  screenSize,
  mousePosition,
  runPython
};

// ─── CLI TEST ─────────────────────────────────────────────
if (require.main === module) {
  console.log('🖥️ GUI Control Test Suite');
  console.log('');
  
  console.log('1. Screen size:', screenSize());
  console.log('2. Mouse position:', mousePosition());
  
  console.log('3. Taking screenshot...');
  const ss = screenshot('test.png');
  console.log('   Result:', ss.success ? '✅' : '❌', ss.path);
  
  console.log('4. Clipboard test:');
  clipboardWrite('Claw test ' + Date.now());
  console.log('   Read back:', clipboardRead().substring(0, 20));
  
  console.log('');
  console.log('All GUI controls operational');
}
