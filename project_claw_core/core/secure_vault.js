const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VAULT_FILE = path.join(__dirname, '..', 'memory', '.vault.enc');

class SecureVault {
  constructor(key) {
    this.key = crypto.scryptSync(key, 'salt', 32);
  }
  store(service, value) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let enc = cipher.update(value, 'utf8', 'hex');
    enc += cipher.final('hex');
    const auth = cipher.getAuthTag().toString('hex');
    const data = { iv: iv.toString('hex'), auth, enc };
    fs.writeFileSync(VAULT_FILE, JSON.stringify(data));
    return true;
  }
}

module.exports = { SecureVault };