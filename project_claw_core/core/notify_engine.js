/**
 * PROJECT CLAW CORE — Notify Engine
 * Windows toast notifications.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'notify_engine.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function sendToast(title, message, options = {}) {
  log(`Sending toast: ${title}`);
  
  const ps = `
$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
$null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime]
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$xml = $template
$texts = $xml.GetElementsByTagName('text')
$texts.Item(0).AppendChild($xml.CreateTextNode('${title.replace(/'/g, "''")}')) | Out-Null
$texts.Item(1).AppendChild($xml.CreateTextNode('${message.replace(/'/g, "''")}')) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claw')
$notifier.Show($toast)
`;
  
  try {
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 10000 });
    return { success: true };
  } catch(e) {
    log('Toast failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

function sendBalloonTip(title, message) {
  log(`Sending balloon tip: ${title}`);
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.BalloonTipTitle = '${title.replace(/'/g, "''")}'
$notify.BalloonTipText = '${message.replace(/'/g, "''")}'
$notify.Visible = $true
$notify.ShowBalloonTip(5000)
Start-Sleep -Seconds 5
$notify.Dispose()
`;
  try {
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 15000 });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

class NotifyEngine {
  notify(title, message) {
    const toast = sendToast(title, message);
    if (toast.success) return toast;
    return sendBalloonTip(title, message);
  }
}

module.exports = { NotifyEngine, sendToast, sendBalloonTip };

if (require.main === module) {
  const engine = new NotifyEngine();
  console.log(engine.notify('Claw Notify Test', 'Notification engine is working'));
}
