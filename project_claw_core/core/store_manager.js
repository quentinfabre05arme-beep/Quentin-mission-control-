/**
 * PROJECT CLAW CORE — Store Manager
 * Manage file-based key-value store.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'store_manager.log');
const STORE_DIR = path.join(__dirname, '..', 'data', 'store');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class StoreManager {
  constructor(storePath = STORE_DIR) {
    this.storePath = storePath;
    fs.mkdirSync(storePath, { recursive: true });
  }
  
  _filePath(key) {
    return path.join(this.storePath, `${key}.json`);
  }
  
  set(key, value) {
    log(`Store set: ${key}`);
    fs.writeFileSync(this._filePath(key), JSON.stringify(value, null, 2));
    return { success: true, key };
  }
  
  get(key) {
    log(`Store get: ${key}`);
    const file = this._filePath(key);
    if (!fs.existsSync(file)) return { success: false, error: 'not found' };
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { success: true, key, value };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  list() {
    const keys = fs.readdirSync(this.storePath).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    return { success: true, keys };
  }
  
  delete(key) {
    log(`Store delete: ${key}`);
    const file = this._filePath(key);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return { success: true, key };
  }
}

module.exports = { StoreManager };

if (require.main === module) {
  const store = new StoreManager();
  store.set('user_preference', { theme: 'dark' });
  console.log(JSON.stringify(store.get('user_preference'), null, 2));
  console.log(JSON.stringify(store.list(), null, 2));
}
