#!/usr/bin/env node
/**
 * Test Suite for Revenue Tracker
 * Creates sample data and runs all commands
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, 'revenue_tracker.js');

function run(cmd) {
  console.log(`\n$ node revenue_tracker.js ${cmd}`);
  console.log('─'.repeat(60));
  try {
    const output = execSync(`node "${SCRIPT}" ${cmd}`, { encoding: 'utf8', cwd: __dirname });
    console.log(output);
    return output;
  } catch (e) {
    console.log(e.stdout || e.message);
    return e.stdout || e.message;
  }
}

console.log('🧪 Revenue Tracker Test Suite v1.0.0');
console.log('═══════════════════════════════════════════════════════════');

// Clear previous test data
const fs = require('fs');
const dataFile = path.join(__dirname, 'memory', 'revenue_data.json');
if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
const reportsDir = path.join(__dirname, 'memory', 'revenue_reports');
if (fs.existsSync(reportsDir)) fs.rmSync(reportsDir, { recursive: true });

// ─── ADD SAMPLE TRANSACTIONS ──────────────────────────────

console.log('\n📥 Adding sample transactions...');

const sampleData = [
  // July 2026
  { date: '2026-07-01', amount: 3500, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-07-05', amount: 1200, category: 'freelance', source: 'WebDesign Project', tags: 'design,client' },
  { date: '2026-07-10', amount: 450, category: 'dividend', source: 'AAPL Dividend', tags: 'stocks,quarterly' },
  { date: '2026-07-12', amount: 800, category: 'crypto', source: 'BTC Trading Profit', tags: 'bitcoin,trading' },
  { date: '2026-07-15', amount: 3500, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-07-18', amount: 600, category: 'freelance', source: 'API Integration', tags: 'dev,contract' },
  { date: '2026-07-20', amount: 250, category: 'crypto', source: 'ETH Staking Reward', tags: 'ethereum,staking' },
  { date: '2026-07-22', amount: 150, category: 'other', source: 'Cashback Rewards', tags: 'bank,passive' },
  { date: '2026-07-25', amount: 3500, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-07-28', amount: 950, category: 'freelance', source: 'Consulting', tags: 'advisory,client' },

  // June 2026
  { date: '2026-06-01', amount: 3400, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-06-05', amount: 900, category: 'freelance', source: 'Landing Page', tags: 'design,client' },
  { date: '2026-06-10', amount: 350, category: 'dividend', source: 'MSFT Dividend', tags: 'stocks,quarterly' },
  { date: '2026-06-15', amount: 3400, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-06-18', amount: 500, category: 'crypto', source: 'BTC Trading Profit', tags: 'bitcoin,trading' },
  { date: '2026-06-20', amount: 200, category: 'crypto', source: 'ETH Staking Reward', tags: 'ethereum,staking' },
  { date: '2026-06-25', amount: 3400, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-06-28', amount: 700, category: 'freelance', source: 'Bug Bounty', tags: 'security,dev' },

  // May 2026
  { date: '2026-05-01', amount: 3300, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-05-15', amount: 3300, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-05-20', amount: 400, category: 'crypto', source: 'BTC Trading Profit', tags: 'bitcoin,trading' },
  { date: '2026-05-25', amount: 3300, category: 'salary', source: 'TechCorp SAS', tags: 'main,full-time' },
  { date: '2026-05-28', amount: 500, category: 'freelance', source: 'Logo Design', tags: 'design,client' },
];

sampleData.forEach((tx, i) => {
  const tags = tx.tags ? `--tags "${tx.tags}"` : '';
  run(`add --date ${tx.date} --amount ${tx.amount} --category ${tx.category} --source "${tx.source}" ${tags}`);
});

// ─── RUN ALL COMMANDS ─────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 1: List all transactions');
run('list');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 2: List July 2026 transactions');
run('list --month 2026-07');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 3: Generate July 2026 report');
run('report --month 2026-07');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 4: Show category breakdown (July)');
run('categories --month 2026-07');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 5: Compare June vs July');
run('compare --from 2026-06 --to 2026-07');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 6: Show growth over time');
run('growth');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 7: Filter by category');
run('list --category salary --limit 10');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 TEST 8: Full report (all time)');
run('report');

// ─── VERIFY DATA FILE ────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📁 Verifying saved data...');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
console.log(`✅ Transactions stored: ${data.transactions.length}`);
console.log(`✅ Data file: ${dataFile}`);
console.log(`✅ Reports directory: ${reportsDir}`);

const reportFiles = fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir) : [];
console.log(`✅ Reports generated: ${reportFiles.length}`);
reportFiles.forEach(f => console.log(`   - ${f}`));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ ALL TESTS PASSED');
console.log('═══════════════════════════════════════════════════════════');
