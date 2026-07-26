/**
 * File Organizer
 * Auto-organize files based on rules
 */

const fs = require('fs');
const path = require('path');

class FileOrganizer {
  constructor() {
    this.rules = [];
  }

  addRule({ pattern, targetDir, recursive = false }) {
    this.rules.push({ pattern, targetDir, recursive });
    return this;
  }

  organize(sourceDir, options = {}) {
    const { dryRun = false, log = true } = options;
    const results = [];
    
    const files = this.getFiles(sourceDir);
    
    for (const file of files) {
      const rule = this.matchRule(file);
      if (rule) {
        const targetPath = path.join(rule.targetDir, path.basename(file));
        
        if (dryRun) {
          results.push({ action: 'would_move', from: file, to: targetPath });
        } else {
          if (!fs.existsSync(rule.targetDir)) {
            fs.mkdirSync(rule.targetDir, { recursive: true });
          }
          
          fs.renameSync(file, targetPath);
          results.push({ action: 'moved', from: file, to: targetPath });
        }
      }
    }
    
    return results;
  }

  getFiles(dir, recursive = true) {
    let files = [];
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile()) {
        files.push(fullPath);
      } else if (recursive && stat.isDirectory()) {
        files = files.concat(this.getFiles(fullPath, recursive));
      }
    }
    
    return files;
  }

  matchRule(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath).toLowerCase();
    
    for (const rule of this.rules) {
      if (rule.pattern.test(name) || rule.pattern.test(ext)) {
        return rule;
      }
    }
    
    return null;
  }

  // Built-in rules
  static rules = {
    images: { pattern: /\.(jpg|jpeg|png|gif|webp|svg)$/i, targetDir: 'images' },
    documents: { pattern: /\.(pdf|doc|docx|txt|md)$/i, targetDir: 'documents' },
    code: { pattern: /\.(js|ts|py|java|cpp|c|h)$/i, targetDir: 'code' },
    data: { pattern: /\.(json|csv|xml|yaml|yml)$/i, targetDir: 'data' },
    archives: { pattern: /\.(zip|rar|7z|tar|gz)$/i, targetDir: 'archives' }
  };
}

module.exports = FileOrganizer;
