#!/usr/bin/env node
/**
 * Revenue Tracker v1.0.0
 * Tracks all income sources, records transactions, calculates totals,
 * generates reports, and shows growth over time.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'memory');
const DATA_FILE = path.join(DATA_DIR, 'revenue_data.json');
const REPORTS_DIR = path.join(DATA_DIR, 'revenue_reports');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Load or initialize data
function loadData() {
  ensureDirs();
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  return { transactions: [], metadata: { created: new Date().toISOString(), version: '1.0.0' } };
}

// Save data
function saveData(data) {
  ensureDirs();
  data.metadata.last_updated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate UUID
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Parse date to YYYY-MM-DD
function parseDate(d) {
  if (!d) return new Date().toISOString().split('T')[0];
  return new Date(d).toISOString().split('T')[0];
}

// ─── COMMANDS ─────────────────────────────────────────────

function addTransaction(args) {
  const data = loadData();
  const tx = {
    id: uuid(),
    date: parseDate(args.date || args.d),
    amount: parseFloat(args.amount || args.a),
    currency: (args.currency || args.c || 'EUR').toUpperCase(),
    category: (args.category || args.cat || 'other').toLowerCase(),
    source: args.source || args.s || 'Unknown',
    tags: (args.tags || args.t || '').split(',').filter(Boolean).map(t => t.trim()),
    notes: args.notes || args.n || '',
    created_at: new Date().toISOString()
  };

  if (isNaN(tx.amount) || tx.amount <= 0) {
    console.error('❌ Error: Amount must be a positive number');
    process.exit(1);
  }

  data.transactions.push(tx);
  saveData(data);
  console.log(`✅ Added: ${tx.category} +${tx.amount.toFixed(2)} ${tx.currency} from "${tx.source}" on ${tx.date}`);
  return tx;
}

function listTransactions(args) {
  const data = loadData();
  const limit = parseInt(args.limit || args.l || 20);
  const category = (args.category || args.cat || '').toLowerCase();
  const month = args.month || args.m;

  let txs = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (category) txs = txs.filter(t => t.category === category);
  if (month) txs = txs.filter(t => t.date.startsWith(month));

  console.log(`\n📋 Revenue Transactions (${txs.length} total, showing ${Math.min(limit, txs.length)})`);
  console.log('─'.repeat(80));
  console.log(`${'Date'.padEnd(12)} ${'Category'.padEnd(12)} ${'Amount'.padStart(12)} ${'Source'.padEnd(20)} ${'Tags'.padEnd(15)}`);
  console.log('─'.repeat(80));

  txs.slice(0, limit).forEach(t => {
    const amountStr = `${t.amount.toFixed(2)} ${t.currency}`.padStart(12);
    const tagStr = t.tags.join(', ').substring(0, 14).padEnd(15);
    console.log(`${t.date.padEnd(12)} ${t.category.padEnd(12)} ${amountStr} ${t.source.padEnd(20)} ${tagStr}`);
  });

  console.log('─'.repeat(80));
  const total = txs.reduce((sum, t) => sum + t.amount, 0);
  console.log(`Total: ${total.toFixed(2)} EUR (shown transactions)\n`);
}

function generateReport(args) {
  const data = loadData();
  const month = args.month || args.m;
  const year = args.year || args.y;

  let txs = data.transactions;
  if (month) txs = txs.filter(t => t.date.startsWith(month));
  if (year) txs = txs.filter(t => t.date.startsWith(year));

  if (txs.length === 0) {
    console.log('⚠️ No transactions found for the specified period.');
    return;
  }

  // Calculate totals
  const total = txs.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = {};
  const bySource = {};

  txs.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    bySource[t.source] = (bySource[t.source] || 0) + t.amount;
  });

  const periodLabel = month || year || 'All Time';
  const report = {
    period: periodLabel,
    generated_at: new Date().toISOString(),
    summary: {
      total_revenue: total,
      transaction_count: txs.length,
      average_per_transaction: total / txs.length,
      categories: Object.keys(byCategory).length,
      sources: Object.keys(bySource).length
    },
    by_category: byCategory,
    by_source: bySource,
    transactions: txs
  };

  // Save report
  const reportFile = path.join(REPORTS_DIR, `report_${periodLabel.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  // Print report
  console.log(`\n📊 Revenue Report: ${periodLabel}`);
  console.log('═'.repeat(50));
  console.log(`Total Revenue:      ${total.toFixed(2)} EUR`);
  console.log(`Transactions:       ${txs.length}`);
  console.log(`Average/Tx:         ${(total / txs.length).toFixed(2)} EUR`);
  console.log(`Categories:         ${Object.keys(byCategory).length}`);
  console.log(`Sources:            ${Object.keys(bySource).length}`);
  console.log('─'.repeat(50));

  console.log('\n📁 By Category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      console.log(`  ${cat.padEnd(12)} ${amt.toFixed(2).padStart(10)} EUR  (${pct}%)`);
    });

  console.log('\n🏢 Top Sources:');
  Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([src, amt]) => {
      console.log(`  ${src.padEnd(20)} ${amt.toFixed(2).padStart(10)} EUR`);
    });

  console.log(`\n💾 Report saved: ${reportFile}\n`);
  return report;
}

function showCategories(args) {
  const data = loadData();
  const month = args.month || args.m;
  let txs = data.transactions;
  if (month) txs = txs.filter(t => t.date.startsWith(month));

  const byCategory = {};
  txs.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || { amount: 0, count: 0 });
    byCategory[t.category].amount += t.amount;
    byCategory[t.category].count += 1;
  });

  const total = txs.reduce((sum, t) => sum + t.amount, 0);

  console.log(`\n📂 Category Breakdown${month ? ` (${month})` : ''}`);
  console.log('─'.repeat(50));
  Object.entries(byCategory)
    .sort((a, b) => b[1].amount - a[1].amount)
    .forEach(([cat, info]) => {
      const pct = ((info.amount / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
      console.log(`${cat.padEnd(12)} ${bar} ${info.amount.toFixed(2).padStart(10)} EUR (${info.count} tx)`);
    });
  console.log('─'.repeat(50));
  console.log(`${'TOTAL'.padEnd(12)} ${' '.repeat(20)} ${total.toFixed(2).padStart(10)} EUR\n`);
}

function comparePeriods(args) {
  const data = loadData();
  const from = args.from;
  const to = args.to;

  if (!from || !to) {
    console.error('❌ Usage: compare --from 2026-06 --to 2026-07');
    process.exit(1);
  }

  const txsFrom = data.transactions.filter(t => t.date.startsWith(from));
  const txsTo = data.transactions.filter(t => t.date.startsWith(to));

  const totalFrom = txsFrom.reduce((sum, t) => sum + t.amount, 0);
  const totalTo = txsTo.reduce((sum, t) => sum + t.amount, 0);
  const change = totalTo - totalFrom;
  const pctChange = totalFrom > 0 ? ((change / totalFrom) * 100).toFixed(1) : 'N/A';

  console.log(`\n📈 Period Comparison: ${from} → ${to}`);
  console.log('═'.repeat(50));
  console.log(`${from.padEnd(15)} ${totalFrom.toFixed(2).padStart(12)} EUR  (${txsFrom.length} tx)`);
  console.log(`${to.padEnd(15)} ${totalTo.toFixed(2).padStart(12)} EUR  (${txsTo.length} tx)`);
  console.log('─'.repeat(50));
  const arrow = change >= 0 ? '▲' : '▼';
  const sign = change >= 0 ? '+' : '';
  console.log(`Change:        ${arrow} ${sign}${change.toFixed(2).padStart(10)} EUR  (${sign}${pctChange}%)\n`);
}

function showGrowth(args) {
  const data = loadData();
  const txs = [...data.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  const monthly = {};
  txs.forEach(t => {
    const month = t.date.substring(0, 7);
    monthly[month] = (monthly[month] || 0) + t.amount;
  });

  const months = Object.keys(monthly).sort();
  if (months.length < 2) {
    console.log('⚠️ Need at least 2 months of data for growth analysis.');
    return;
  }

  console.log('\n📈 Revenue Growth Over Time');
  console.log('═'.repeat(60));
  console.log(`${'Month'.padEnd(10)} ${'Revenue'.padStart(12)} ${'MoM Change'.padStart(12)} ${'Growth %'.padStart(10)} ${'Chart'.padStart(15)}`);
  console.log('─'.repeat(60));

  let prev = 0;
  const maxVal = Math.max(...Object.values(monthly));
  months.forEach(m => {
    const val = monthly[m];
    const change = prev > 0 ? val - prev : 0;
    const pct = prev > 0 ? ((change / prev) * 100).toFixed(1) : '-';
    const sign = change >= 0 ? '+' : '';
    const barLen = Math.round((val / maxVal) * 15);
    const bar = '█'.repeat(barLen).padEnd(15);
    const changeStr = prev > 0 ? `${sign}${change.toFixed(2)}` : '-';
    console.log(`${m.padEnd(10)} ${val.toFixed(2).padStart(12)} ${changeStr.padStart(12)} ${pct.padStart(10)} ${bar}`);
    prev = val;
  });

  const first = monthly[months[0]];
  const last = monthly[months[months.length - 1]];
  const totalGrowth = ((last - first) / first * 100).toFixed(1);
  console.log('─'.repeat(60));
  console.log(`Total Growth (${months[0]} → ${months[months.length - 1]}): ${totalGrowth > 0 ? '+' : ''}${totalGrowth}%\n`);
}

// ─── CLI PARSER ───────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.replace(/^-/, '');
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function showHelp() {
  console.log(`
📊 Revenue Tracker v1.0.0

Commands:
  add      Add a revenue transaction
  list     List all transactions
  report   Generate revenue report
  categories  Show category breakdown
  compare  Compare two periods
  growth   Show growth over time
  help     Show this help

Examples:
  node revenue_tracker.js add --amount 5000 --category salary --source "Acme Corp"
  node revenue_tracker.js list --month 2026-07
  node revenue_tracker.js report --month 2026-07
  node revenue_tracker.js categories --month 2026-07
  node revenue_tracker.js compare --from 2026-06 --to 2026-07
  node revenue_tracker.js growth
`);
}

// ─── MAIN ─────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const command = process.argv[2];

  switch (command) {
    case 'add':
      addTransaction(args);
      break;
    case 'list':
      listTransactions(args);
      break;
    case 'report':
      generateReport(args);
      break;
    case 'categories':
      showCategories(args);
      break;
    case 'compare':
      comparePeriods(args);
      break;
    case 'growth':
      showGrowth(args);
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

main();
