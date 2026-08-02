/**
 * PROJECT CLAW CORE — Self Audit
 * Audit capabilities and report which are real vs stubs.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'self_audit.log');
const DIRS = ['core', 'agents', 'memory'];

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function isStub(content) {
  // Count lines and return statements to distinguish real code from stubs
  const lines = content.split('\n').length;
  const stubPatterns = [
    /\/\/ Placeholder/i,
    /\/\/ TODO\b/i,
    /NOT_IMPLEMENTED/i,
    /throw new Error\(['"]Not implemented['"]\)/i,
    /console\.log\(['"]Stub:/i
  ];
  
  let stubScore = 0;
  for (const pattern of stubPatterns) {
    if (pattern.test(content)) stubScore += 2;
  }
  
  // Short files with many simple return statements are likely stubs
  const simpleReturns = (content.match(/return \{ success: (true|false)\s*\};/g) || []).length;
  const emptyReturns = (content.match(/return \[\];/g) || []).length;
  const emptyObjects = (content.match(/return \{\};/g) || []).length;
  
  if (lines < 30 && (simpleReturns + emptyReturns + emptyObjects) >= 2) stubScore += 3;
  if (lines < 50 && stubScore >= 2) stubScore += 2;
  
  return stubScore;
}

function analyzeFile(filePath, content) {
  const lines = content.split('\n').length;
  const stubScore = isStub(content);
  const hasClass = /class\s+\w+\s*\{/.test(content);
  const hasRealMethods = hasClass && (content.match(/\b\w+\([^)]*\)\s*\{/g) || []).length >= 2;
  const hasRealLogic = lines > 40 && (
    content.includes('require(') ||
    content.includes('execSync(') ||
    content.includes('exec(') ||
    content.includes('spawn(') ||
    content.includes('https.request(') ||
    content.includes('http.request(') ||
    content.includes('fetch(') ||
    content.includes('new Promise(') ||
    hasClass
  ) && stubScore < 5 && (hasRealMethods || hasClass || (lines > 60 && content.includes('module.exports')));
  
  return {
    path: filePath,
    lines,
    stub_score: stubScore,
    real: hasRealLogic,
    has_tests: /if \(require\.main === module\)/.test(content) || /test/i.test(content)
  };
}

const vm = require('vm');

function syntaxCheck(content) {
  try {
    new vm.Script(content);
    return { valid: true };
  } catch(e) {
    return { valid: false, error: e.message };
  }
}

class SelfAudit {
  constructor() {
    this.dirs = ['core', 'agents', 'memory'];
  }
  
  run() {
    const results = this._runInternal();
    const report = this._buildReport(results);
    fs.writeFileSync(LOG_FILE, JSON.stringify(report, null, 2) + '\n', { flag: 'a' });
    return report;
  }
  
  _runInternal() {
    log('Running self audit');
    const root = path.join(__dirname, '..');
    const results = { total: 0, real: 0, stubs: 0, syntax_errors: 0, details: [] };
    
    for (const dir of this.dirs) {
      const fullDir = path.join(root, dir);
      if (!fs.existsSync(fullDir)) continue;
      const files = fs.readdirSync(fullDir).filter(f => {
        if (!f.endsWith('.js')) return false;
        const base = f.replace(/_v\d+\.js$/, '.js');
        return base === f || !fs.existsSync(path.join(fullDir, base));
      });
      for (const file of files) {
        const filePath = path.join(fullDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const analysis = analyzeFile(filePath, content);
        const syntax = syntaxCheck(content);
        
        analysis.syntax_valid = syntax.valid;
        if (!syntax.valid) {
          analysis.syntax_error = syntax.error;
          results.syntax_errors++;
        }
        
        if (analysis.real) results.real++;
        else results.stubs++;
        results.total++;
        results.details.push(analysis);
      }
    }
    
    results.details.sort((a, b) => (b.real - a.real) || (b.lines - a.lines));
    return results;
  }
  
  _buildReport(results) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        real: results.real,
        stubs: results.stubs,
        syntax_errors: results.syntax_errors,
        real_percent: ((results.real / results.total) * 100).toFixed(1)
      },
      syntax_errors_details: results.details.filter(d => !d.syntax_valid).map(d => ({
        path: d.path,
        error: d.syntax_error
      })),
      real_capabilities: results.details.filter(d => d.real).map(d => path.basename(d.path)),
      top_stubs: results.details.filter(d => !d.real).slice(0, 20).map(d => path.basename(d.path)),
      details: results.details
    };
  }
}

module.exports = { SelfAudit };

if (require.main === module) {
  const audit = new SelfAudit();
  const report = audit.run();
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('\nReal capabilities:', report.real_capabilities.length);
  console.log(report.real_capabilities.slice(0, 20).join(', '));
}
