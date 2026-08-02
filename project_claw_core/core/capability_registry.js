/**
 * PROJECT CLAW CORE — Capability Registry
 * Auto-generated registry of all capabilities with metadata.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'capability_registry.log');
const REGISTRY_FILE = path.join(__dirname, '..', 'data', 'capability_registry.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class CapabilityRegistry {
  constructor() {
    this.dirs = ['project_claw_core/core', 'project_claw_core/agents', 'project_claw_core/memory'];
  }
  
  scan() {
    log('Scanning capabilities');
    const capabilities = [];
    for (const dir of this.dirs) {
      const fullDir = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullDir)) continue;
      const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js') && !/_v\d+\.js$/.test(f));
      for (const file of files) {
        const filePath = path.join(fullDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const classMatch = content.match(/class\s+(\w+)/);
        const functionCount = (content.match(/\b\w+\([^)]*\)\s*\{/g) || []).length;
        const lines = content.split('\n').length;
        const hasTests = /if \(require\.main === module\)/.test(content);
        const category = dir.split('/').pop();
        capabilities.push({
          name: path.basename(file, '.js'),
          category,
          path: filePath,
          class: classMatch ? classMatch[1] : null,
          lines,
          functions: functionCount,
          has_tests: hasTests
        });
      }
    }
    return capabilities;
  }
  
  build() {
    const capabilities = this.scan();
    const registry = {
      generated_at: new Date().toISOString(),
      count: capabilities.length,
      by_category: {},
      capabilities
    };
    for (const c of capabilities) {
      if (!registry.by_category[c.category]) registry.by_category[c.category] = [];
      registry.by_category[c.category].push(c.name);
    }
    fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
    log(`Registry built: ${capabilities.length} capabilities`);
    return registry;
  }
  
  find(name) {
    const registry = this.build();
    return registry.capabilities.find(c => c.name === name);
  }
}

module.exports = { CapabilityRegistry };

if (require.main === module) {
  const registry = new CapabilityRegistry();
  const data = registry.build();
  console.log(JSON.stringify({ count: data.count, categories: Object.keys(data.by_category) }, null, 2));
}
