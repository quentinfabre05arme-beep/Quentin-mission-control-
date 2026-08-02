/**
 * PROJECT CLAW CORE — Package Installer
 * Install apps and packages via winget, chocolatey, npm, pip.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'package_installer.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function runCommand(cmd, timeoutMs = 300000) {
  log(`Running: ${cmd}`);
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: timeoutMs,
      stdio: 'pipe'
    });
    return { success: true, output: output.trim() };
  } catch(e) {
    log(`Command failed: ${e.message}`);
    return { success: false, error: e.message, output: e.stdout || '' };
  }
}

class PackageInstaller {
  async installWinget(packageId) {
    return runCommand(`winget install --id ${packageId} --accept-package-agreements --accept-source-agreements -e`);
  }
  
  async installChoco(packageName) {
    return runCommand(`choco install ${packageName} -y`);
  }
  
  async installNpm(packageName, global = false) {
    const g = global ? ' -g' : '';
    return runCommand(`npm install${g} ${packageName}`);
  }
  
  async installPip(packageName) {
    return runCommand(`pip install ${packageName}`);
  }
  
  async isInstalled(command) {
    const result = runCommand(`where ${command}`, 10000);
    return result.success;
  }
  
  async ensure(command, installers) {
    if (await this.isInstalled(command)) {
      return { success: true, note: `${command} already installed` };
    }
    
    for (const [method, pkg] of installers) {
      log(`Trying ${method} install for ${command}...`);
      let result;
      if (method === 'winget') result = await this.installWinget(pkg);
      else if (method === 'choco') result = await this.installChoco(pkg);
      else if (method === 'npm') result = await this.installNpm(pkg, true);
      else if (method === 'pip') result = await this.installPip(pkg);
      
      if (result.success && await this.isInstalled(command)) {
        return { success: true, method, output: result.output };
      }
    }
    
    return { success: false, error: 'All install methods failed' };
  }
}

module.exports = { PackageInstaller };

if (require.main === module) {
  (async () => {
    const installer = new PackageInstaller();
    const result = await installer.ensure('ffmpeg', [
      ['winget', 'Gyan.FFmpeg'],
      ['choco', 'ffmpeg'],
      ['npm', 'ffmpeg-static']
    ]);
    console.log(JSON.stringify(result, null, 2));
  })();
}
