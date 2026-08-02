/**
 * PROJECT CLAW CORE — Click by Text
 * Click screen elements by their visible text.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'click_by_text.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function clickByText(text, partial = true) {
  log(`Clicking by text: ${text}`);
  const matchOp = partial ? '-like' : '-eq';
  const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Clicker {
  [DllImport(\"user32.dll\")] public static extern bool SetCursorPos(int x, int y);
  [DllImport(\"user32.dll\")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
\"@
$el = Get-UIAWindow | Get-UIAControl -Name "${text.replace(/'/g, "''")}"
if ($el) {
  $rect = $el.Current.BoundingRectangle
  $x = ($rect.left + $rect.right) / 2
  $y = ($rect.top + $rect.bottom) / 2
  [Clicker]::SetCursorPos([int]$x, [int]$y)
  [Clicker]::mouse_event(0x0002, 0, 0, 0, 0)
  [Clicker]::mouse_event(0x0004, 0, 0, 0, 0)
  Write-Output \"CLICKED\"
} else {
  Write-Output \"NOT_FOUND\"
}
`;
  try {
    const output = execSync(`powershell -c "${ps}"`, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    return { success: output.trim() === 'CLICKED', result: output.trim() };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

class ClickByText {
  click(text) { return clickByText(text); }
}

module.exports = { ClickByText, clickByText };

if (require.main === module) {
  const clicker = new ClickByText();
  console.log(JSON.stringify(clicker.click('Paramètres'), null, 2));
}
