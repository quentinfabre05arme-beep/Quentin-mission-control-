// Revenue Tracker Mission
// Tracks all income streams autonomously

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const REVENUE_LOG = path.join(__dirname, 'revenue_log.jsonl');

class RevenueTracker {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return {
        mission: 'revenue_tracker',
        role: 'revenue-tracking',
        status: 'initialized',
        streams: [],
        totalEarned: 0,
        monthlyTarget: 1000
      };
    }
  }

  saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  // Add revenue stream
  addStream(name, type, expectedMonthly) {
    const stream = {
      id: Date.now().toString(36),
      name,
      type, // 'product', 'service', 'trading', 'affiliate'
      expectedMonthly,
      actualMonthly: 0,
      status: 'active',
      created: new Date().toISOString()
    };
    
    this.state.streams.push(stream);
    this.saveState();
    
    return stream;
  }

  // Record income
  recordIncome(streamId, amount, source) {
    const entry = {
      timestamp: new Date().toISOString(),
      streamId,
      amount,
      source,
      currency: 'EUR'
    };
    
    fs.appendFileSync(REVENUE_LOG, JSON.stringify(entry) + '\n');
    
    // Update stream
    const stream = this.state.streams.find(s => s.id === streamId);
    if (stream) {
      stream.actualMonthly += amount;
      stream.lastIncome = new Date().toISOString();
    }
    
    this.state.totalEarned += amount;
    this.saveState();
    
    return entry;
  }

  // Get report
  getReport() {
    const totalExpected = this.state.streams.reduce((a, s) => a + s.expectedMonthly, 0);
    const totalActual = this.state.streams.reduce((a, s) => a + s.actualMonthly, 0);
    
    return {
      streams: this.state.streams.length,
      totalEarned: this.state.totalEarned,
      monthlyTarget: this.state.monthlyTarget,
      totalExpected,
      totalActual,
      progress: totalExpected > 0 ? (totalActual / totalExpected * 100).toFixed(1) : 0,
      streams: this.state.streams
    };
  }

  getStatus() {
    return {
      mission: this.state.mission,
      status: this.state.status,
      streams: this.state.streams.length,
      totalEarned: this.state.totalEarned,
      monthlyTarget: this.state.monthlyTarget
    };
  }
}

module.exports = RevenueTracker;

// CLI
if (require.main === module) {
  const tracker = new RevenueTracker();
  
  const command = process.argv[2];
  
  if (command === 'setup') {
    // Setup initial revenue streams
    tracker.addStream('Digital Products', 'product', 500);
    tracker.addStream('Trading Signals', 'service', 300);
    tracker.addStream('Consulting', 'service', 200);
    
    console.log('✅ Revenue streams set up:');
    tracker.state.streams.forEach(s => {
      console.log('  - ' + s.name + ': €' + s.expectedMonthly + '/month');
    });
    console.log('\nTarget: €' + tracker.state.monthlyTarget + '/month');
    
  } else if (command === 'report') {
    const report = tracker.getReport();
    console.log('=== REVENUE REPORT ===');
    console.log('Streams:', report.streams);
    console.log('Total earned: €' + report.totalEarned);
    console.log('Monthly target: €' + report.monthlyTarget);
    console.log('Expected monthly: €' + report.totalExpected);
    console.log('Actual monthly: €' + report.totalActual);
    
  } else if (command === 'status') {
    console.log(JSON.stringify(tracker.getStatus(), null, 2));
  } else {
    console.log('Usage: node revenue_tracker.js [setup|report|status]');
  }
}
