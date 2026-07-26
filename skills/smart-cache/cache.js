/**
 * Smart Cache Manager
 * Intelligent caching with expiration and cleanup
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

class SmartCache {
  constructor() {
    this.cacheDir = CACHE_DIR;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  get(key) {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (this.isExpired(data)) {
      fs.unlinkSync(filePath);
      return null;
    }
    return data.value;
  }

  set(key, value, ttlMinutes = 60) {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    const data = {
      value,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMinutes * 60000).toISOString()
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  }

  isExpired(data) {
    return new Date() > new Date(data.expiresAt);
  }

  cleanup() {
    const files = fs.readdirSync(this.cacheDir);
    let cleaned = 0;
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(this.cacheDir, file), 'utf8'));
        if (this.isExpired(data)) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          cleaned++;
        }
      }
    }
    return { cleaned, total: files.length };
  }
}

module.exports = SmartCache;
