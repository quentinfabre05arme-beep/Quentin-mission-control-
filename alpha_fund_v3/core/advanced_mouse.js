#!/usr/bin/env node
/**
 * 🔥 ADVANCED MOUSE CONTROLLER
 * Drag, right-click, double-click, hover
 */

const { execSync } = require('child_process');

// ─── DRAG ─────────────────────────────────────────────────
function drag(fromX, fromY, toX, toY, duration = 0.5) {
  try {
    execSync(
      `python -c "import pyautogui; pyautogui.moveTo(${fromX}, ${fromY}); pyautogui.dragTo(${toX}, ${toY}, duration=${duration})"`,
      { timeout: 10000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── DOUBLE CLICK ─────────────────────────────────────────
function doubleClick(x, y) {
  try {
    execSync(
      `python -c "import pyautogui; pyautogui.doubleClick(${x}, ${toY})"`,
      { timeout: 5000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── RIGHT CLICK ────────────────────────────────────────
function rightClick(x = null, y = null) {
  try {
    const pos = x !== null && y !== null ? `(${x}, ${y})` : '';
    execSync(
      `python -c "import pyautogui; pyautogui.rightClick${pos}"`,
      { timeout: 5000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── HOVER ────────────────────────────────────────────────
function hover(x, y, duration = 1) {
  try {
    execSync(
      `python -c "import pyautogui; pyautogui.moveTo(${x}, ${y}, duration=0.5); import time; time.sleep(${duration})"`,
      { timeout: (duration + 2) * 1000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { drag, doubleClick, rightClick, hover };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🔥 Advanced Mouse Controller');
  console.log('');
  console.log('Ready for drag, double-click, right-click, hover');
  console.log('Use: drag(x1,y1,x2,y2), doubleClick(x,y), rightClick(x,y), hover(x,y)');
}
