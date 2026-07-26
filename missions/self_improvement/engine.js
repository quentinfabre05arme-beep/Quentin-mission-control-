// Self-Improvement Engine for OpenClaw
// Runs every 6 hours to analyze, learn, and improve

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\memory';
const LOG_FILE = path.join(MEMORY_DIR, 'self_improvement.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

function readRecentMemory(days = 7) {
  const files = fs.readdirSync(MEMORY_DIR)
    .filter(f => f.endsWith('.md') && f.match(/^\d{4}-\d{2}-\d{2}/))
    .sort()
    .slice(-days);
  
  return files.map(f => {
    const content = fs.readFileSync(path.join(MEMORY_DIR, f), 'utf8');
    return { file: f, content };
  });
}

function extractPatterns(entries) {
  const patterns = {
    decisions: [],
    errors: [],
    improvements: [],
    recurring: []
  };
  
  entries.forEach(entry => {
    const lines = entry.content.split('\n');
    lines.forEach(line => {
      // Extract decisions
      if (line.match(/decided|chosen|opted|selected/i)) {
        patterns.decisions.push(line.trim());
      }
      // Extract errors
      if (line.match(/error|fail|bug|broken|crash/i)) {
        patterns.errors.push(line.trim());
      }
      // Extract improvements
      if (line.match(/improve|enhance|better|optimize|fix/i)) {
        patterns.improvements.push(line.trim());
      }
      // Extract recurring topics
      if (line.match(/cron|config|skill|memory|token/i)) {
        patterns.recurring.push(line.trim());
      }
    });
  });
  
  return patterns;
}

function updateLongTermMemory(patterns) {
  const memoryFile = 'C:\\Users\\quent\\.openclaw\\workspace\\MEMORY.md';
  let memory = fs.readFileSync(memoryFile, 'utf8');
  
  // Add new patterns section
  const newSection = `\n## Auto-Extracted Patterns (${new Date().toISOString().split('T')[0]})\n\n` +
    `### Decisions (${patterns.decisions.length})\n` +
    patterns.decisions.slice(0, 5).map(d => `- ${d}`).join('\n') + '\n\n' +
    `### Errors Found (${patterns.errors.length})\n` +
    patterns.errors.slice(0, 5).map(e => `- ${e}`).join('\n') + '\n\n' +
    `### Improvements (${patterns.improvements.length})\n` +
    patterns.improvements.slice(0, 5).map(i => `- ${i}`).join('\n') + '\n';
  
  // Append to memory
  fs.appendFileSync(memoryFile, newSection);
  log('Updated MEMORY.md with new patterns');
}

function checkSystemHealth() {
  const issues = [];
  
  // Check memory usage
  const total = require('os').totalmem();
  const free = require('os').freemem();
  if (free / total < 0.1) {
    issues.push('Memory critical: <10% free');
  }
  
  // Check config
  try {
    const config = require('C:/Users/quent/.openclaw/openclaw.json');
    if (!config.agents?.defaults?.tools?.elevated) {
      issues.push('Elevated tools not enabled');
    }
  } catch (e) {
    issues.push('Config error: ' + e.message);
  }
  
  return issues;
}

function main() {
  log('=== Self-Improvement Cycle Started ===');
  
  // Step 1: Read recent memory
  const entries = readRecentMemory(7);
  log(`Read ${entries.length} daily notes`);
  
  // Step 2: Extract patterns
  const patterns = extractPatterns(entries);
  log(`Found: ${patterns.decisions.length} decisions, ${patterns.errors.length} errors, ${patterns.improvements.length} improvements`);
  
  // Step 3: Update long-term memory
  if (patterns.decisions.length > 0 || patterns.errors.length > 0) {
    updateLongTermMemory(patterns);
  }
  
  // Step 4: Check system health
  const issues = checkSystemHealth();
  if (issues.length > 0) {
    log('Issues found:');
    issues.forEach(i => log(`  - ${i}`));
  } else {
    log('System health: OK');
  }
  
  // Step 5: Log completion
  log('=== Self-Improvement Cycle Complete ===\n');
}

main();
