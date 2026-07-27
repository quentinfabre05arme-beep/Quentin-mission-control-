/**
 * DECISION JOURNAL SYSTEM
 * Track every major investment decision
 * 
 * Usage:
 *   node decision_journal.js new        # Create new entry
 *   node decision_journal.js list       # List recent decisions
 *   node decision_journal.js review     # Review patterns
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const JOURNAL_FILE = path.join(__dirname, 'decision_journal.json');

function loadJournal() {
  if (fs.existsSync(JOURNAL_FILE)) {
    return JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf8'));
  }
  return { entries: [], stats: {} };
}

function saveJournal(journal) {
  fs.writeFileSync(JOURNAL_FILE, JSON.stringify(journal, null, 2));
}

function createEntry() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    status: 'open' // open, closed
  };

  const questions = [
    { key: 'symbol', question: 'Symbol: ' },
    { key: 'decision', question: 'Decision (buy/sell/hold/skip): ' },
    { key: 'price', question: 'Price: ' },
    { key: 'shares', question: 'Shares (if applicable): ' },
    { key: 'context', question: 'Context (signals, research): ' },
    { key: 'expectations', question: 'What do you expect to happen? ' },
    { key: 'probability', question: 'Confidence (0-100%): ' },
    { key: 'timeframe', question: 'Expected timeframe: ' },
    { key: 'emotional_state', question: 'Emotional state (calm/anxious/confident/etc): ' },
    { key: 'biases_checked', question: 'Biases checked (FOMO/revenge/etc): ' },
    { key: 'stop_loss', question: 'Stop loss (if applicable): ' },
    { key: 'targets', question: 'Targets (if applicable): ' },
    { key: 'thesis', question: 'Brief thesis (2-3 sentences): ' },
    { key: 'why_wrong', question: 'Why might you be wrong? ' },
    { key: 'review_date', question: 'Review date (when to check): ' }
  ];

  let i = 0;
  function askNext() {
    if (i >= questions.length) {
      const journal = loadJournal();
      journal.entries.push(entry);
      saveJournal(journal);
      console.log('\n✅ Decision logged successfully');
      console.log(`ID: ${entry.id}`);
      rl.close();
      return;
    }

    const q = questions[i];
    rl.question(q.question, (answer) => {
      entry[q.key] = answer;
      i++;
      askNext();
    });
  }

  console.log('\n=== NEW DECISION ENTRY ===\n');
  askNext();
}

function closeEntry() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const journal = loadJournal();
  const openEntries = journal.entries.filter(e => e.status === 'open');

  if (openEntries.length === 0) {
    console.log('No open entries to close');
    rl.close();
    return;
  }

  console.log('\n=== CLOSE ENTRY ===\n');
  openEntries.forEach((e, i) => {
    console.log(`${i + 1}. ${e.symbol} - ${e.decision} at $${e.price} (${e.date.substring(0, 10)})`);
  });

  rl.question('\nSelect entry number: ', (num) => {
    const entry = openEntries[parseInt(num) - 1];
    if (!entry) {
      console.log('Invalid selection');
      rl.close();
      return;
    }

    const closeQuestions = [
      { key: 'exit_price', question: 'Exit price: ' },
      { key: 'exit_date', question: 'Exit date: ' },
      { key: 'pnl', question: 'P&L ($): ' },
      { key: 'outcome_vs_expectations', question: 'Did it match expectations? (yes/no/partial): ' },
      { key: 'surprises', question: 'What surprised you? ' },
      { key: 'lessons', question: 'Key lessons: ' },
      { key: 'would_repeat', question: 'Would you repeat this decision? (yes/no): ' },
      { key: 'what_to_change', question: 'What would you change? ' }
    ];

    let i = 0;
    function askClose() {
      if (i >= closeQuestions.length) {
        entry.status = 'closed';
        entry.closed_at = new Date().toISOString();
        saveJournal(journal);
        console.log('\n✅ Entry closed successfully');
        rl.close();
        return;
      }

      const q = closeQuestions[i];
      rl.question(q.question, (answer) => {
        entry[q.key] = answer;
        i++;
        askClose();
      });
    }

    askClose();
  });
}

function listEntries() {
  const journal = loadJournal();
  const recent = journal.entries.slice(-10).reverse();

  console.log('\n=== RECENT DECISIONS ===\n');
  recent.forEach(e => {
    const status = e.status === 'open' ? '🟡' : '✅';
    const pnl = e.pnl ? ` ($${e.pnl})` : '';
    console.log(`${status} ${e.date.substring(0, 10)} | ${e.symbol} | ${e.decision} @ $${e.price}${pnl}`);
    console.log(`   Thesis: ${e.thesis?.substring(0, 60)}...`);
    if (e.lessons) {
      console.log(`   Lesson: ${e.lessons}`);
    }
    console.log();
  });
}

function reviewPatterns() {
  const journal = loadJournal();
  const closed = journal.entries.filter(e => e.status === 'closed');

  if (closed.length === 0) {
    console.log('No closed entries to analyze');
    return;
  }

  // Analyze by decision type
  const byDecision = {};
  closed.forEach(e => {
    if (!byDecision[e.decision]) {
      byDecision[e.decision] = { count: 0, wins: 0, losses: 0, totalPnl: 0 };
    }
    byDecision[e.decision].count++;
    const pnl = parseFloat(e.pnl) || 0;
    byDecision[e.decision].totalPnl += pnl;
    if (pnl > 0) byDecision[e.decision].wins++;
    else if (pnl < 0) byDecision[e.decision].losses++;
  });

  console.log('\n=== DECISION PATTERN ANALYSIS ===\n');
  Object.entries(byDecision).forEach(([decision, stats]) => {
    const winRate = (stats.wins / stats.count * 100).toFixed(1);
    console.log(`${decision.toUpperCase()}`);
    console.log(`  Trades: ${stats.count}`);
    console.log(`  Win Rate: ${winRate}% (${stats.wins}/${stats.losses})`);
    console.log(`  Total P&L: $${stats.totalPnl.toFixed(2)}`);
    console.log(`  Avg P&L: $${(stats.totalPnl / stats.count).toFixed(2)}`);
    console.log();
  });

  // Common lessons
  const lessons = closed.map(e => e.lessons).filter(Boolean);
  if (lessons.length > 0) {
    console.log('=== COMMON LESSONS ===\n');
    lessons.slice(-5).forEach((l, i) => {
      console.log(`${i + 1}. ${l}`);
    });
  }
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'new':
    createEntry();
    break;
  case 'close':
    closeEntry();
    break;
  case 'list':
    listEntries();
    break;
  case 'review':
    reviewPatterns();
    break;
  default:
    console.log('Usage:');
    console.log('  node decision_journal.js new     # Create new entry');
    console.log('  node decision_journal.js close   # Close an entry');
    console.log('  node decision_journal.js list     # List recent decisions');
    console.log('  node decision_journal.js review   # Review patterns');
}
