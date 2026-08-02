/**
 * ALPHA FUND v3.0 — Unified Orchestrator
 * Single entry point for all fund operations
 * Merges: mission_control + investment_fund + trading_bot
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  version: '3.0.0',
  fund_name: 'Alpha Fund v3.0',
  mode: 'PAPER', // PAPER | LIVE
  capital: 10000,
  max_positions: 10,
  risk_per_trade: 0.15, // 15% max per position
  stop_loss: 0.08, // -8%
  take_profit: 0.25, // +25%
  data_dir: path.join(__dirname, 'data'),
  config_dir: path.join(__dirname, 'config'),
  enable_ram_cleanup: true, // Auto-cleanup between cycles
  enable_autonomy: true // A+ engine integration
};

// ─── A+ AUTONOMY ENGINE ────────────────────────────────────
let autonomyEngine = null;
function loadAutonomy() {
  if (CONFIG.enable_autonomy && !autonomyEngine) {
    try {
      autonomyEngine = require('./core/autonomy_engine');
      console.log('🛡️ A+ Autonomy Engine loaded');
    } catch(e) {
      console.log('⚠️ Autonomy engine not available');
    }
  }
  return autonomyEngine;
}

// ─── RAM CLEANUP UTILITY ────────────────────────────────────
const ramCleanup = require('./scripts/ram_cleanup');

function autoCleanup() {
  if (CONFIG.enable_ram_cleanup) {
    try {
      const result = ramCleanup.cleanup();
      if (result.saved_mb > 0) {
        console.log(`🧹 Auto-cleanup: ${result.before.pct}% → ${result.after.pct}% (${result.saved_mb}MB freed)`);
      }
    } catch(e) {}
  }
}

function guardedCleanup() {
  const a = loadAutonomy();
  if (a) {
    const canProceed = a.ramGuard();
    if (!canProceed) {
      console.error('⏸️ RAM CRITICAL — Operation paused');
      a.logEvent('OPERATION_PAUSED', { ram: a.state.ram_pct, reason: 'RAM critical before operation' });
      return false;
    }
  }
  autoCleanup();
  return true;
}

// ─── UNIFIED PORTFOLIO ──────────────────────────────────────
const PORTFOLIO_FILE = path.join(CONFIG.data_dir, 'portfolio.json');

function loadPortfolio() {
  if (fs.existsSync(PORTFOLIO_FILE)) {
    return JSON.parse(fs.readFileSync(PORTFOLIO_FILE, 'utf8'));
  }
  return {
    cash: CONFIG.capital,
    initial_capital: CONFIG.capital,
    positions: [],
    history: [],
    trades: [],
    performance: {
      total_return: 0,
      win_rate: 0,
      total_trades: 0,
      max_drawdown: 0
    },
    created: new Date().toISOString(),
    version: CONFIG.version
  };
}

function savePortfolio(portfolio) {
  fs.mkdirSync(CONFIG.data_dir, { recursive: true });
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
}

// ─── RESEARCH LAYER ─────────────────────────────────────────
async function runResearch() {
  console.log('🔬 [RESEARCH] Running unified research pipeline...\n');
  
  // Import and run merged research modules
  const research = require('./research/unified_research');
  const results = await research.runAll();
  
  console.log(`✅ Research complete: ${results.assets.length} assets analyzed`);
  console.log(`📊 Signals: ${results.signals.buy} BUY, ${results.signals.hold} HOLD, ${results.signals.sell} SELL\n`);
  
  return results;
}

// ─── INTELLIGENCE LAYER ─────────────────────────────────────
async function runIntelligence() {
  console.log('🧠 [INTELLIGENCE] Running catalyst & risk analysis...\n');
  
  const intel = require('./intelligence/unified_intelligence');
  const results = await intel.runAll();
  
  console.log(`✅ Intelligence: ${results.catalysts} catalysts, ${results.alerts.length} alerts\n`);
  
  return results;
}

// ─── EXECUTION LAYER ────────────────────────────────────────
async function runExecution(research, intelligence) {
  console.log('⚡ [EXECUTION] Generating signals & sizing positions...\n');
  
  const execution = require('./execution/unified_execution');
  const portfolio = loadPortfolio();
  
  const signals = execution.generateSignals(research, intelligence, portfolio);
  const sized = execution.sizePositions(signals, portfolio);
  const trades = execution.executePaper(sized, portfolio);
  
  savePortfolio(portfolio);
  
  console.log(`✅ Execution: ${trades.length} trades executed`);
  console.log(`💰 Cash: $${portfolio.cash.toFixed(2)} | Positions: ${portfolio.positions.length}/${CONFIG.max_positions}\n`);
  
  return { signals, trades, portfolio };
}

// ─── DASHBOARD UPDATE ───────────────────────────────────────
function updateDashboard(results) {
  console.log('📊 [DASHBOARD] Updating views...\n');
  
  const dashboard = require('./dashboard/unified_dashboard');
  dashboard.update(results);
  
  console.log('✅ Dashboard updated\n');
}

// ─── COMMANDS ───────────────────────────────────────────────
const COMMANDS = {
  daily: async () => {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║     ALPHA FUND v${CONFIG.version} — DAILY CYCLE              ║`);
    console.log(`║     Mode: ${CONFIG.mode} | Capital: $${CONFIG.capital.toLocaleString()}                    ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
    
    // A+ AUTONOMY: RAM guard before heavy operations
    const a = loadAutonomy();
    if (a && !a.ramGuard()) {
      console.error('⏸️ SYSTEM PAUSED — RAM critical. Skipping cycle.');
      a.logDecision('DAILY_CYCLE_SKIPPED', `RAM at ${a.state.ram_pct}% — too dangerous to run`);
      return null;
    }
    
    // Auto-cleanup before heavy operations
    if (!guardedCleanup()) return null;
    
    const research = await runResearch();
    const intelligence = await runIntelligence();
    const execution = await runExecution(research, intelligence);
    updateDashboard({ research, intelligence, execution });
    
    // Log decision
    if (a) {
      a.logDecision('DAILY_CYCLE_COMPLETE', 'Ran research + intelligence + execution');
      a.updateDashboard();
    }
    
    console.log('🎯 Daily cycle complete!\n');
    return execution.portfolio;
  },
  
  research: async () => {
    const results = await runResearch();
    return results;
  },
  
  signals: async () => {
    const research = await runResearch();
    const execution = require('./execution/unified_execution');
    const signals = execution.generateSignals(research, null, loadPortfolio());
    console.log('\n📡 SIGNALS:');
    signals.forEach(s => {
      console.log(`   ${s.action} ${s.ticker}: Score ${s.score.toFixed(2)} (${s.confidence})`);
    });
    return signals;
  },
  
  trade: async () => {
    const research = await runResearch();
    const intelligence = await runIntelligence();
    return await runExecution(research, intelligence);
  },
  
  status: () => {
    const portfolio = loadPortfolio();
    const totalValue = portfolio.cash + portfolio.positions.reduce((sum, p) => sum + (p.quantity * p.current_price), 0);
    const totalReturn = ((totalValue / portfolio.initial_capital) - 1) * 100;
    
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║           ${CONFIG.fund_name.toUpperCase()} — PORTFOLIO STATUS           ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log(`\n   Mode: ${CONFIG.mode === 'PAPER' ? '📄 PAPER TRADING' : '💰 LIVE TRADING'}`);
    console.log(`\n💰 Cash: $${portfolio.cash.toFixed(2)}`);
    console.log(`📈 Total Value: $${totalValue.toFixed(2)} (${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%)`);
    console.log(`📊 Positions: ${portfolio.positions.length}/${CONFIG.max_positions}`);
    console.log(`🔄 Trades: ${portfolio.performance.total_trades}`);
    console.log(`🏆 Win Rate: ${portfolio.performance.win_rate.toFixed(1)}%`);
    console.log(`📉 Max Drawdown: ${portfolio.performance.max_drawdown.toFixed(1)}%`);
    console.log(`\n📋 Holdings:`);
    portfolio.positions.forEach(p => {
      const pnl = ((p.current_price / p.entry_price) - 1) * 100;
      console.log(`   ${p.ticker}: ${p.quantity} @ $${p.entry_price.toFixed(2)} → $${p.current_price.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%)`);
    });
    console.log();
    return portfolio;
  },
  
  init: () => {
    fs.mkdirSync(CONFIG.data_dir, { recursive: true });
    const portfolio = loadPortfolio();
    savePortfolio(portfolio);
    console.log('✅ Alpha Fund v3.0 initialized!');
    console.log(`📁 Data directory: ${CONFIG.data_dir}`);
    console.log(`💰 Starting capital: $${CONFIG.capital.toLocaleString()}`);
    console.log(`🎯 Mode: ${CONFIG.mode}\n`);
    return portfolio;
  }
};

// ─── MAIN ───────────────────────────────────────────────────
async function main() {
  const command = process.argv[2] || 'status';
  
  if (COMMANDS[command]) {
    try {
      await COMMANDS[command]();
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`\n❓ Unknown command: ${command}`);
    console.log(`\nAvailable commands:`);
    console.log(`  daily     — Full daily cycle (research + trade)`);
    console.log(`  research  — Run research pipeline only`);
    console.log(`  signals   — Generate trading signals`);
    console.log(`  trade     — Execute paper trades`);
    console.log(`  status    — Show portfolio status`);
    console.log(`  init      — Initialize fund\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CONFIG, COMMANDS, loadPortfolio, savePortfolio };
