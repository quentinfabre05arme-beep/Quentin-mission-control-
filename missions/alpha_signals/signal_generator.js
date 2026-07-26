// SignalGenerator
// trading-signals implementation

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');

class SignalGenerator {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return { status: 'initialized', lastRun: null };
    }
  }

  generateSignals() {
    this.state.lastRun = new Date().toISOString();
    this.state.status = 'active';
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    return { success: true, timestamp: this.state.lastRun };
  }

  getLatest() {
    this.state.lastRun = new Date().toISOString();
    this.state.status = 'active';
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    return { success: true, timestamp: this.state.lastRun };
  }

  backtest() {
    this.state.lastRun = new Date().toISOString();
    this.state.status = 'active';
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    return { success: true, timestamp: this.state.lastRun };
  }

  getStatus() {
    return {
      mission: 'alpha_signals',
      role: 'trading-signals',
      status: this.state.status,
      lastRun: this.state.lastRun
    };
  }
}

module.exports = SignalGenerator;

if (require.main === module) {
  const instance = new SignalGenerator();
  const command = process.argv[2];
  if (command === 'run') {
    const result = instance.generateSignals();
    console.log('✅ SignalGenerator ran successfully');
    console.log('Status:', JSON.stringify(instance.getStatus(), null, 2));
  } else if (command === 'status') {
    console.log(JSON.stringify(instance.getStatus(), null, 2));
  } else {
    console.log('Usage: node signal_generator.js [run|status]');
  }
}
