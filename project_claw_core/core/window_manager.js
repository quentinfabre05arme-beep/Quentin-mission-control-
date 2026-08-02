/**
 * PROJECT CLAW CORE — Window Manager
 * List, focus, move, resize windows on Windows.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'window_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function listWindows() {
  try {
    const output = execSync('powershell -c "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json -Compress"', {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000
    });
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch(e) {
    return { error: e.message };
  }
}

function focusWindow(title) {
  log(`Focusing window: ${title}`);
  const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinFocus {
  [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport(\"user32.dll\")] public static extern bool IsIconic(IntPtr hWnd);
}
\"@
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like \"*${title}*\" } | Select-Object -First 1
if ($proc) {
  if ([WinFocus]::IsIconic($proc.MainWindowHandle)) { [WinFocus]::ShowWindowAsync($proc.MainWindowHandle, 9) }
  [WinFocus]::SetForegroundWindow($proc.MainWindowHandle)
  Write-Output \"FOCUSED\"
} else {
  Write-Output \"NOT_FOUND\"
}
`;
  try {
    const result = execSync(`powershell -c "${ps}"`, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    return { success: result.trim() === 'FOCUSED' };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function minimizeWindow(title) {
  const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinMin {
  [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
\"@
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like \"*${title}*\" } | Select-Object -First 1
if ($proc) { [WinMin]::ShowWindowAsync($proc.MainWindowHandle, 6); Write-Output \"MINIMIZED\" }
`;
  try {
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 10000 });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function closeWindow(title) {
  log(`Closing window: ${title}`);
  try {
    execSync(`powershell -c "Get-Process | Where-Object { $_.MainWindowTitle -like '*${title}*' } | Select-Object -First 1 | Stop-Process -Force"`, {
      windowsHide: true,
      timeout: 10000
    });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

module.exports = { listWindows, focusWindow, minimizeWindow, closeWindow };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'list') {
    console.log(JSON.stringify(listWindows(), null, 2));
  } else if (cmd === 'focus') {
    console.log(focusWindow(process.argv[3]));
  } else {
    console.log('Usage: node window_manager.js [list|focus <title>]');
  }
}
