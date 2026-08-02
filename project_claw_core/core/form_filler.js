/**
 * PROJECT CLAW CORE — Form Filler
 * Fill forms via UI automation (sendkeys approach).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'form_filler.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function sendKeys(text) {
  const vbs = `Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.SendKeys "${text.replace(/"/g, '""').replace(/\n/g, "{ENTER}")}"
`;
  const file = path.join(process.env.TEMP, `formfill_${Date.now()}.vbs`);
  fs.writeFileSync(file, vbs);
  try {
    execSync(`cscript //nologo "${file}"`, { windowsHide: true, timeout: 10000 });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

class FormFiller {
  fillFields(fields) {
    log(`Filling ${fields.length} fields`);
    const results = [];
    for (const field of fields) {
      // Tab to next field, then type value
      const r = sendKeys(`{TAB}${field.value}`);
      results.push({ field: field.name || field.value.slice(0, 20), ...r });
    }
    return { success: true, results };
  }
  
  submit() {
    return sendKeys('{ENTER}');
  }
}

module.exports = { FormFiller };

if (require.main === module) {
  const filler = new FormFiller();
  console.log(JSON.stringify(filler.fillFields([
    { name: 'username', value: 'test' },
    { name: 'password', value: 'secret' }
  ]), null, 2));
}
