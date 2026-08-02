/**
 * PROJECT CLAW CORE — UI Automation
 * Launch applications, list windows, basic keyboard/mouse control.
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'ui_automation.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function launchApp(appNameOrPath) {
  log(`Launching: ${appNameOrPath}`);
  try {
    execSync(`start "" "${appNameOrPath}"`, { windowsHide: true });
    return { success: true, app: appNameOrPath };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function listWindows() {
  log('Listing windows');
  try {
    const result = execSync('powershell -c "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName, MainWindowTitle, Id | Format-Table -AutoSize"', {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000
    });
    return result;
  } catch(e) {
    return { error: e.message };
  }
}

function bringToFront(windowTitle) {
  log(`Bringing to front: ${windowTitle}`);
  const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
  [DllImport(\"user32.dll\")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport(\"user32.dll\")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
\"@
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like \"*${windowTitle}*\" } | Select-Object -First 1
if ($proc) {
  [WinAPI]::ShowWindowAsync($proc.MainWindowHandle, 9)
  [WinAPI]::SetForegroundWindow($proc.MainWindowHandle)
  Write-Output \"OK\"
} else {
  Write-Output \"NOT_FOUND\"
}
`;
  try {
    const result = execSync(`powershell -c "${ps}"`, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    return { success: result.includes('OK'), result: result.trim() };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function typeText(text) {
  log(`Typing text: ${text.slice(0, 50)}`);
  // Requires an active window. Use PowerShell SendKeys via WScript.Shell
  const vbs = `Set WshShell = WScript.CreateObject("WScript.Shell")\nWshShell.SendKeys "${text.replace(/"/g, '""').replace(/\n/g, "{ENTER}")}"\n`;
  const vbsFile = path.join(process.env.TEMP, 'claw_type.vbs');
  fs.writeFileSync(vbsFile, vbs);
  try {
    execSync(`cscript //nologo "${vbsFile}"`, { windowsHide: true, timeout: 10000 });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function pressKey(key) {
  log(`Pressing key: ${key}`);
  const vbs = `Set WshShell = WScript.CreateObject("WScript.Shell")\nWshShell.SendKeys "{${key}}"\n`;
  const vbsFile = path.join(process.env.TEMP, 'claw_key.vbs');
  fs.writeFileSync(vbsFile, vbs);
  try {
    execSync(`cscript //nologo "${vbsFile}"`, { windowsHide: true, timeout: 5000 });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

module.exports = { launchApp, listWindows, bringToFront, typeText, pressKey };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'list') {
    console.log(listWindows());
  } else if (cmd === 'launch') {
    console.log(launchApp(process.argv[3]));
  } else {
    console.log('Usage: node ui_automation.js [list|launch <app>]');
  }
}
