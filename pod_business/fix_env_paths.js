const fs = require('fs');
const path = require('path');

// Scripts that use .env.local (broken token)
const scriptsToFix = [
  'connection_test.js',
  'publish_working_v2.js',
  // Add more as discovered
];

console.log('🔧 Checking scripts for .env.local vs .env usage...\n');

scriptsToFix.forEach(script => {
  const filePath = path.join(__dirname, script);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ ${script} — not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('.env.local')) {
    console.log(`🔴 ${script} — uses .env.local (needs fix)`);
    // Show line
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('.env.local')) {
        console.log(`   Line ${i+1}: ${line.trim()}`);
      }
    });
  } else if (content.includes("'.env'")) {
    console.log(`✅ ${script} — uses .env (correct)`);
  } else {
    console.log(`⚪ ${script} — no .env reference found`);
  }
});

// Also check which env files exist
console.log('\n📁 Environment files:');
['.env', '.env.local', '.env.pinterest'].forEach(f => {
  const exists = fs.existsSync(path.join(__dirname, f));
  console.log(`   ${exists ? '✅' : '❌'} ${f}`);
});
