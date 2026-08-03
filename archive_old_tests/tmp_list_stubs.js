const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dirs = ['project_claw_core/core', 'project_claw_core/agents', 'project_claw_core/memory'];

function isStub(content) {
  const lines = content.split('\n').length;
  const stubPatterns = [ /\/\/ Placeholder/, /\/\/ TODO/, /NOT_IMPLEMENTED/, /throw new Error\(['"']Not implemented['"']\)/, /console\.log\(['"']Stub:/ ];
  let stubScore = 0;
  for (const p of stubPatterns) if (p.test(content)) stubScore += 2;
  const simpleReturns = (content.match(/return \{ success: (true|false)\s*\};/g) || []).length;
  const emptyReturns = (content.match(/return \[\];/g) || []).length;
  const emptyObjects = (content.match(/return \{\};/g) || []).length;
  if (lines < 30 && (simpleReturns + emptyReturns + emptyObjects) >= 2) stubScore += 3;
  if (lines < 50 && stubScore >= 2) stubScore += 2;
  return stubScore;
}

const stubs = [];
for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split('\n').length;
    const stubScore = isStub(content);
    const hasRealLogic = lines > 40 && (content.includes('require(') || content.includes('execSync(') || content.includes('exec(') || content.includes('spawn(') || content.includes('https.request(') || content.includes('http.request(') || content.includes('fetch(') || content.includes('new Promise(') || /class\s+\w+\s*\{/.test(content)) && stubScore < 3;
    if (!hasRealLogic) stubs.push(file);
  }
}

console.log(JSON.stringify(stubs, null, 2));
