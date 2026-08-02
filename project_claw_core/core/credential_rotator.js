/**
 * PROJECT CLAW CORE — Credential Rotator
 * Rotate credentials by updating stored passwords.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'credential_rotator.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class CredentialRotator {
  constructor() {
    this.vault = null;
    this._tryLoadVault();
  }
  
  _tryLoadVault() {
    try {
      const path = require('path');
      const { SecureVault } = require(path.join(process.cwd(), 'project_claw_core', 'core', 'secure_vault'));
      this.vault = new SecureVault();
    } catch(e) {}
  }
  
  generatePassword(length = 24) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  rotate(service, username) {
    log(`Rotating credentials for ${service}`);
    const newPassword = this.generatePassword();
    if (this.vault) {
      return this.vault.store(service, username, newPassword);
    }
    return {
      success: true,
      note: 'Vault not available; generated password not persisted',
      service,
      newPassword,
      length: newPassword.length
    };
  }
}

module.exports = { CredentialRotator };

if (require.main === module) {
  const rotator = new CredentialRotator();
  const result = rotator.rotate('example_service', 'user@example.com');
  console.log(JSON.stringify(rotator.rotate('example_service', 'user@example.com'), null, 2));
}
