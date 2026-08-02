#!/usr/bin/env node
/**
 * 🔔 WINDOWS NOTIFICATION ENGINE
 * Toast notifications, alerts, system tray
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── TOAST NOTIFICATION ───────────────────────────────────
function toast(title, message, icon = 'info') {
  try {
    // Use BurntToast if available, fallback to msg
    execSync(
      `powershell -c "` +
      `if (Get-Module -ListAvailable -Name BurntToast) { ` +
      `  Import-Module BurntToast; ` +
      `  New-BurntToastNotification -Text '${title.replace(/'/g, "''")}', '${message.replace(/'/g, "''")}' -AppLogo ${icon}; ` +
      `} else { ` +
      `  Add-Type -AssemblyName System.Windows.Forms; ` +
      `  [System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', '${title.replace(/'/g, "''")}'); ` +
      `}"`,
      { timeout: 10000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    // Fallback to msg
    try {
      execSync(`msg * /TIME:5 "${title}: ${message}"`, { timeout: 5000 });
      return { success: true, method: 'msg' };
    } catch(e2) {
      return { error: e2.message };
    }
  }
}

// ─── TRAY BALLOON ─────────────────────────────────────────
function trayBalloon(title, message) {
  try {
    execSync(
      `powershell -c "` +
      `Add-Type -AssemblyName System.Windows.Forms; ` +
      `$icon = New-Object System.Windows.Forms.NotifyIcon; ` +
      `$icon.Icon = [System.Drawing.SystemIcons]::Information; ` +
      `$icon.BalloonTipTitle = '${title.replace(/'/g, "''")}'; ` +
      `$icon.BalloonTipText = '${message.replace(/'/g, "''")}'; ` +
      `$icon.Visible = $true; ` +
      `$icon.ShowBalloonTip(5000); ` +
      `Start-Sleep -Seconds 6; ` +
      `$icon.Dispose()"`,
      { timeout: 15000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { toast, trayBalloon };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🔔 Windows Notification Engine');
  console.log('');
  
  console.log('Testing tray balloon...');
  const result = trayBalloon('Claw Alert', 'Phase 2 build in progress');
  console.log(result.success ? '✅ Tray notification sent' : '❌ ' + result.error);
  
  console.log('');
  console.log('Notification engine ready');
}
