/**
 * PROJECT CLAW CORE — Secure Vault
 * Encrypted storage for sensitive data (uses credential_manager.js).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'secure_vault.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class SecureVault {
  constructor(vaultPath = path.join(process.cwd(), '.secure_vault.enc'), keyPath = path.join(process.cwd(), '.vault_secret.key')) {
    this.vaultPath = vaultPath;
    this.keyPath = keyPath;
    this._tryLoadCM();
  }
  
  _tryLoadCM() {
    try {
      const cmPath = require('path').join(process.cwd(), 'credential_manager');
      const { storeCredential, getCredential, listCredentials } = require(cmPath);
      this.storeCredential = storeCredential;
      this.getCredential = getCredential;
      this.listCredentials = listCredentials;
    } catch(e) {
      console.error('CM load error:', e.message);
    }
  }
  
  store(service, username, password) {
    log(`Vault store request: ${service}`);
    if (this.storeCredential) {
      try {
        this.storeCredential(service, username, password);
        return { success: true, service, stored: true };
      } catch(e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Credential manager not available' };
  }
  
  retrieve(service) {
    log(`Vault retrieve request: ${service}`);
    if (this.getCredential) {
      try {
        const cred = this.getCredential(service);
        return cred ? { success: true, service, username: cred.username, password: '***REDACTED***' } : { success: false, error: 'Not found' };
      } catch(e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Credential manager not available' };
  }
  
  listServices() {
    log('Vault list services');
    if (this.listCredentials) {
      try {
        this.listCredentials();
        return { success: true };
      } catch(e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Credential manager not available' };
  }
}

module.exports = { SecureVault };

if (require.main === module) {
  const vault = new SecureVault();
  console.log(JSON.stringify(vault.listServices(), null, 2));
}
