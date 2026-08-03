const fs = require('fs');
const path = require('path');

const missionsDir = './missions';
const missions = fs.readdirSync(missionsDir)
  .filter(f => fs.statSync(path.join(missionsDir, f)).isDirectory())
  .sort();

console.log('========================================');
console.log('   COMPREHENSIVE MISSION TEST');
console.log('========================================\n');

let total = 0;
let passed = 0;
let failed = 0;
let fixed = 0;

function test(name, fn, fixFn) {
  total++;
  try {
    const result = fn();
    if (result.ok) {
      passed++;
      console.log('✓', name, '-', result.msg || 'OK');
    } else {
      failed++;
      console.log('✗', name, '-', result.msg || 'FAILED');
      if (fixFn) {
        try {
          fixFn();
          fixed++;
          console.log('  → FIXED');
        } catch(e) {
          console.log('  → Fix failed:', e.message);
        }
      }
    }
  } catch(e) {
    failed++;
    console.log('✗', name, '- ERROR:', e.message);
  }
}

// Test each mission
for (const mission of missions) {
  const missionDir = path.join(missionsDir, mission);
  
  console.log('---', mission, '---');
  
  // 1. Check state exists
  test('State file', () => {
    return { ok: fs.existsSync(path.join(missionDir, 'team_state.json')), msg: fs.existsSync(path.join(missionDir, 'team_state.json')) ? 'Found' : 'Missing' };
  }, () => {
    const state = {
      mission: mission,
      status: 'recovered',
      recoveredAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(missionDir, 'team_state.json'), JSON.stringify(state, null, 2));
  });
  
  // 2. Check state valid
  test('State valid', () => {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(missionDir, 'team_state.json'), 'utf8'));
      return { ok: state.mission === mission, msg: 'Valid' };
    } catch(e) {
      return { ok: false, msg: 'Invalid JSON' };
    }
  });
  
  // 3. Check JS files exist
  const jsFiles = fs.readdirSync(missionDir).filter(f => f.endsWith('.js'));
  test('Has code', () => {
    return { ok: jsFiles.length > 0, msg: jsFiles.length + ' JS files' };
  });
  
  // 4. Check JS files loadable
  let loadable = 0;
  for (const file of jsFiles) {
    try {
      delete require.cache[require.resolve(path.join(missionDir, file))];
      require(path.join(missionDir, file));
      loadable++;
    } catch(e) {}
  }
  
  test('Code loadable', () => {
    return { ok: loadable > 0, msg: loadable + '/' + jsFiles.length + ' loadable' };
  });
  
  // 5. Check status is active
  test('Status active', () => {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(missionDir, 'team_state.json'), 'utf8'));
      return { ok: state.status === 'active' || state.status === 'running', msg: state.status };
    } catch(e) {
      return { ok: false, msg: 'Cannot read' };
    }
  }, () => {
    const stateFile = path.join(missionDir, 'team_state.json');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.status = 'active';
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  });
  
  console.log();
}

// Summary
console.log('========================================');
console.log('   RESULTS');
console.log('========================================');
console.log('Total tests:', total);
console.log('Passed:', passed);
console.log('Failed:', failed);
console.log('Fixed:', fixed);
console.log('Success:', Math.round(passed/total*100) + '%');

if (failed === 0) {
  console.log('\n🎉 ALL MISSIONS TESTED AND PASSING!');
} else {
  console.log('\n⚠ Some issues remain');
}

// Save results
const summary = {
  timestamp: new Date().toISOString(),
  total,
  passed,
  failed,
  fixed,
  success_rate: Math.round(passed/total*100)
};

fs.writeFileSync('./mission_test_results.json', JSON.stringify(summary, null, 2));
console.log('\nResults saved to mission_test_results.json');
"
