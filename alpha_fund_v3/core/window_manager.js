#!/usr/bin/env node
/**
 * 🪟 WINDOW MANAGER
 * Control application windows: list, focus, move, resize
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── LIST WINDOWS ─────────────────────────────────────────
function listWindows() {
  try {
    const result = execSync(
      `powershell -c "Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json -AsArray"`,
      { encoding: 'utf8', timeout: 10000, windowsHide: true }
    );
    const windows = JSON.parse(result);
    return Array.isArray(windows) ? windows : [windows];
  } catch(e) {
    return [];
  }
}

// ─── FOCUS WINDOW ─────────────────────────────────────────
function focusWindow(titleContains) {
  try {
    execSync(
      `powershell -c "$proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*${titleContains}*' } | Select-Object -First 1; if ($proc) { $sig = '[DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);'; Add-Type -MemberDefinition $sig -Name NativeMethods -Namespace WinAPI; [WinAPI.NativeMethods]::SetForegroundWindow($proc.MainWindowHandle) }"`,
      { timeout: 10000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── MINIMIZE ALL ─────────────────────────────────────────
function minimizeAll() {
  try {
    execSync(
      `powershell -c "$shell = New-Object -ComObject Shell.Application; $shell.MinimizeAll()"`,
      { timeout: 5000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── GET ACTIVE WINDOW ────────────────────────────────────
function getActiveWindow() {
  try {
    const result = execSync(
      `powershell -c "Add-Type '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();'; Add-Type '[DllImport(\"user32.dll\")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);'; $hwnd = [WinAPI]::GetForegroundWindow(); $title = New-Object System.Text.StringBuilder 256; [WinAPI2]::GetWindowText($hwnd, $title, 256); Write-Output $title.ToString()"`,
      { encoding: 'utf8', timeout: 5000, windowsHide: true }
    );
    return { success: true, title: result.trim() };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { listWindows, focusWindow, minimizeAll, getActiveWindow };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🪟 Window Manager');
  console.log('');
  
  console.log('Active window:', getActiveWindow().title || 'N/A');
  console.log('');
  
  console.log('Top 5 windows:');
  const windows = listWindows();
  windows.slice(0, 5).forEach(w => {
    console.log(`  ${w.ProcessName}: ${w.MainWindowTitle?.substring(0, 50) || 'N/A'}`);
  });
  
  console.log('');
  console.log('Window manager ready');
}
