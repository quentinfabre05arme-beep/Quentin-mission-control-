const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('   COMPREHENSIVE TEST & FIX');
console.log('========================================\n');

let tests = 0;
let passed = 0;
let failed = 0;
let fixed = 0;

function test(name, fn) {
  tests++;
  try {
    const result = fn();
    if (result.ok) {
      passed++;
      console.log('✓ ' + name + ': ' + result.msg);
    } else {
      failed++;
      console.log('✗ ' + name + ': ' + result.msg);
      if (result.fix) {
        try {
          result.fix();
          fixed++;
          console.log('  → FIXED');
        } catch(e) {
          console.log('  → Fix failed: ' + e.message);
        }
      }
    }
  } catch(e) {
    failed++;
    console.log('✗ ' + name + ': ERROR - ' + e.message);
  }
}

// TEST 1: Config valid JSON
test('Config JSON valid', () => {
  try {
    JSON.parse(fs.readFileSync('..\\openclaw.json'));
    return { ok: true, msg: 'Valid' };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
});

// TEST 2: Config has cron jobs
test('Cron jobs configured', () => {
  const config = JSON.parse(fs.readFileSync('..\\openclaw.json'));
  const jobs = Object.keys(config.cron?.entries || {});
  return { ok: jobs.length > 0, msg: jobs.length + ' jobs' };
});

// TEST 3: Web search proxy
test('Web search proxy', () => {
  const proxyPath = './lib/web_search_proxy.js';
  if (!fs.existsSync(proxyPath)) {
    return { ok: false, msg: 'Missing' };
  }
  try {
    const Proxy = require(proxyPath);
    const p = new Proxy();
    return { ok: !!p.search, msg: 'Loaded' };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
});

// TEST 4: Secret resolver
test('Secret resolver', () => {
  const resolverPath = './lib/secret_resolver.js';
  if (!fs.existsSync(resolverPath)) {
    return { ok: false, msg: 'Missing' };
  }
  try {
    const resolver = require(resolverPath);
    return { ok: typeof resolver.getSecret === 'function', msg: 'Loaded' };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
});

// TEST 5: All new skills exist
test('New skills (9 built)', () => {
  const skills = ['smart-cache', 'automated-report-generator', 'pattern-recognition-engine',
                  'data-pipeline-processor', 'notification-manager', 'task-scheduler',
                  'file-organizer', 'health-monitor', 'config-manager'];
  const missing = skills.filter(s => !fs.existsSync('./skills/' + s));
  return { ok: missing.length === 0, msg: missing.length > 0 ? 'Missing: ' + missing.join(', ') : 'All 9 present' };
});

// TEST 6: New skills loadable
test('New skills loadable', () => {
  const skills = [
    { file: './skills/smart-cache/cache.js' },
    { file: './skills/automated-report-generator/generator.js' },
    { file: './skills/pattern-recognition-engine/engine.js' },
    { file: './skills/data-pipeline-processor/pipeline.js' },
    { file: './skills/notification-manager/manager.js' },
    { file: './skills/task-scheduler/scheduler.js' },
    { file: './skills/file-organizer/organizer.js' },
    { file: './skills/health-monitor/monitor.js' },
    { file: './skills/config-manager/manager.js' }
  ];
  
  let failed = [];
  for (const skill of skills) {
    try {
      delete require.cache[require.resolve(skill.file)];
      const mod = require(skill.file);
      new mod();
    } catch(e) {
      failed.push(e.message);
    }
  }
  
  return { ok: failed.length === 0, msg: failed.length > 0 ? failed.slice(0,2).join(', ') + '...' : 'All loadable' };
});

// TEST 7: Git repo
test('Git repository', () => {
  return { ok: fs.existsSync('.git'), msg: fs.existsSync('.git') ? 'Active' : 'Missing' };
});

// TEST 8: Logs directory
test('Logs directory', () => {
  if (!fs.existsSync('./logs')) {
    return { ok: false, msg: 'Missing', fix: () => {
      fs.mkdirSync('./logs', { recursive: true });
    }};
  }
  return { ok: true, msg: 'Found' };
});

// TEST 9: Cache directory
test('Cache directory', () => {
  if (!fs.existsSync('./cache')) {
    return { ok: false, msg: 'Missing', fix: () => {
      fs.mkdirSync('./cache', { recursive: true });
    }};
  }
  return { ok: true, msg: 'Found' };
});

// TEST 10: Memory directory
test('Memory directory', () => {
  return { ok: fs.existsSync('./memory'), msg: fs.existsSync('./memory') ? 'Found' : 'Missing' };
});

// TEST 11: Workspace files
test('Workspace files', () => {
  const files = fs.readdirSync('.');
  return { ok: files.length > 400, msg: files.length + ' files' };
});

// TEST 12: Serper API key
test('Serper API key', () => {
  try {
    const secrets = JSON.parse(fs.readFileSync('..\\secrets.json'));
    const hasKey = secrets['serper-api'] || secrets.serper;
    return { ok: !!hasKey, msg: hasKey ? 'Configured' : 'Missing' };
  } catch(e) {
    return { ok: false, msg: e.message };
  }
});

// SUMMARY
console.log('\n========================================');
console.log('   TEST RESULTS');
console.log('========================================');
console.log('Tests:   ' + tests);
console.log('Passed:  ' + passed);
console.log('Failed:  ' + failed);
console.log('Fixed:   ' + fixed);
console.log('Success: ' + Math.round(passed/tests*100) + '%');

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED!');
} else if (fixed > 0) {
  console.log('\n⚠ Some issues auto-fixed');
} else {
  console.log('\n✗ Some issues need manual fix');
}

// FIXES APPLIED
console.log('\n========================================');
console.log('   FIXES APPLIED');
console.log('========================================');

// Fix any missing directories
const dirs = ['./logs', './cache', './tmp', './data'];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created: ' + dir);
  }
}

// Fix any corrupted cache
if (fs.existsSync('./cache') && fs.readdirSync('./cache').length > 100) {
  console.log('Cache has many files, may need cleanup');
}

console.log('\nAudit complete.');
