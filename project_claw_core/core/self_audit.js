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
  const stubPatterns = [
    /return \{ success: (true|false)\s*\};/,
    /return \[\];/,
    /return '';\s*$/m,
    /return \{\};\s*$/m,
    /\/\/ Placeholder/,
    /\/\/ TODO/,
    /NOT_IMPLEMENTED/,
    /throw new Error\(['"]Not implemented['"]\)/
  ];
  
  let stubScore = 0;
  for (const pattern of stubPatterns) {
    if (pattern.test(content)) stubScore++;
  }
  return stubScore;
}

function analyzeFile(filePath, content) {
  const lines = content.split('\n').length;
  const stubScore = isStub(content);
  const hasRealLogic = content.includes('require(') && lines > 30 && stubScore < 2;
  
  return {
    path: filePath,
    lines,
    stub_score: stubScore,
    real: hasRealLogic,
    has_tests: /if \(require\.main === module\)/.test(content) || /test/i.test(content)
  };
}

function syntaxCheck(content) {
  try {
    new Function(content);
    return { valid: true };
  } catch(e) {
    return { valid: false, error: e.message };
  }
}

class SelfAudit {
  run() {
    log('Running self audit');
    const root = path.join(__dirname, '..');
    const results = { total: 0, real: 0, stubs: 0, syntax_errors: 0, details: [] };
    
    for (const dir of DIRS) {
      const fullDir = path.join(root, dir);
      if (!fs.existsSync(fullDir)) continue;
      const files = fs.readdirSync(fullDir).filter(f => {
        if (!f.endsWith('.js')) return false;
        // Skip auto-generated v2+ stub duplicates to focus audit
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
    
    // Sort by real first, then by lines
    results.details.sort((a, b) => (b.real - a.real) || (b.lines - a.lines));
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        real: results.real,
        stubs: results.stubs,
        syntax_errors: results.syntax_errors,
        real_percent: ((results.real / results.total) * 100).toFixed(1)
      },
      real_capabilities: results.details.filter(d => d.real).map(d => path.basename(d.path)),
      top_stubs: results.details.filter(d => !d.real).slice(0, 20).map(d => path.basename(d.path))
    };
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(report, null, 2) + '\n', { flag: 'a' });
    return report;
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
