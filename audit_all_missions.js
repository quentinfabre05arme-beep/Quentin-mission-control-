const fs = require('fs');
const path = require('path');

const missionsDir = './missions';
const missions = fs.readdirSync(missionsDir)
  .filter(f => fs.statSync(path.join(missionsDir, f)).isDirectory())
  .sort();

console.log('========================================');
console.log('   FULL MISSION AUDIT');
console.log('========================================\n');

const results = [];

for (const mission of missions) {
  const missionDir = path.join(missionsDir, mission);
  const files = fs.readdirSync(missionDir);
  
  // Check overlaps
  const hasOrchestrator = files.some(f => f.includes('orchestrator'));
  const hasHealth = files.some(f => f.includes('health') || f.includes('monitor'));
  const hasResearch = files.some(f => f.includes('research'));
  
  // Check state
  const hasState = fs.existsSync(path.join(missionDir, 'team_state.json'));
  
  // Check executable
  const jsFiles = files.filter(f => f.endsWith('.js'));
  let loadable = 0;
  for (const file of jsFiles) {
    try {
      delete require.cache[require.resolve(path.join(missionDir, file))];
      require(path.join(missionDir, file));
      loadable++;
    } catch(e) {}
  }
  
  // Get role
  const roleFile = path.join(missionDir, 'ROLE.md');
  let role = 'undefined';
  if (fs.existsSync(roleFile)) {
    const content = fs.readFileSync(roleFile, 'utf8').split('\n');
    role = content[0].replace('# ', '');
  }
  
  const clean = !hasOrchestrator && !hasHealth && !hasResearch;
  
  results.push({
    name: mission,
    role,
    files: files.length,
    clean,
    hasState,
    jsFiles: jsFiles.length,
    loadable
  });

  // Print summary
  console.log(mission + ':');
  console.log('  Role:', role);
  console.log('  Files:', files.length);
  console.log('  JS loadable:', loadable + '/' + jsFiles.length);
  console.log('  State:', hasState ? 'YES' : 'NO');
  
  if (clean) {
    console.log('  Overlaps: NONE (clean)');
  } else {
    if (hasOrchestrator) console.log('  OVERLAP: orchestrator');
    if (hasHealth) console.log('  OVERLAP: health');
    if (hasResearch) console.log('  OVERLAP: research');
  }
  console.log();
}

console.log('========================================');
console.log('   SUMMARY');
console.log('========================================');

const cleanCount = results.filter(r => r.clean).length;
const needsInit = results.filter(r => !r.hasState).length;

console.log('Total:', results.length);
console.log('Clean:', cleanCount);
console.log('Need init:', needsInit);
console.log('Success:', Math.round(cleanCount/results.length*100) + '%');

// List needs attention
console.log('\n=== NEEDS ATTENTION ===');
for (const r of results) {
  if (!r.clean || !r.hasState) {
    console.log(r.name + ':', !r.clean ? 'has overlaps' : '', !r.hasState ? 'needs init' : '');
  }
}

// Save results
fs.writeFileSync('./mission_audit_results.json', JSON.stringify(results, null, 2));
console.log('\nSaved to mission_audit_results.json');
