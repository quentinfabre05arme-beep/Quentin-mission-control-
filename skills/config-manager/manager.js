/**
 * Config Manager
 * Manage and validate configuration files
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configs = new Map();
  }

  load(configPath) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);
      this.configs.set(configPath, config);
      return { success: true, config };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  validate(config, schema = {}) {
    const errors = [];
    
    for (const [key, requirements] of Object.entries(schema)) {
      if (requirements.required && !config[key]) {
        errors.push(`Missing required field: ${key}`);
      }
      
      if (config[key] && requirements.type) {
        const actualType = typeof config[key];
        if (actualType !== requirements.type) {
          errors.push(`Invalid type for ${key}: expected ${requirements.type}, got ${actualType}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  update(configPath, updates) {
    const result = this.load(configPath);
    if (!result.success) return result;
    
    const updated = { ...result.config, ...updates };
    
    try {
      fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
      this.configs.set(configPath, updated);
      return { success: true, config: updated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  backup(configPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.${timestamp}.bak`;
    
    try {
      fs.copyFileSync(configPath, backupPath);
      return { success: true, backupPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  compare(configPath1, configPath2) {
    const result1 = this.load(configPath1);
    const result2 = this.load(configPath2);
    
    if (!result1.success || !result2.success) {
      return { success: false, error: 'Failed to load one or both configs' };
    }
    
    const differences = this.findDifferences(result1.config, result2.config);
    
    return {
      success: true,
      differences
    };
  }

  findDifferences(obj1, obj2, path = '') {
    const diffs = [];
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = [...new Set([...keys1, ...keys2])];
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj1)) {
        diffs.push({ path: currentPath, type: 'added', value: obj2[key] });
      } else if (!(key in obj2)) {
        diffs.push({ path: currentPath, type: 'removed', value: obj1[key] });
      } else if (typeof obj1[key] !== typeof obj2[key]) {
        diffs.push({ path: currentPath, type: 'type_changed', from: typeof obj1[key], to: typeof obj2[key] });
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
        diffs.push(...this.findDifferences(obj1[key], obj2[key], currentPath));
      } else if (obj1[key] !== obj2[key]) {
        diffs.push({ path: currentPath, type: 'changed', from: obj1[key], to: obj2[key] });
      }
    }
    
    return diffs;
  }
}

module.exports = ConfigManager;
