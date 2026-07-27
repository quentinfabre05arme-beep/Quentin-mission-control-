/**
 * PAPER TRADE MANAGER
 * Tracks positions, executes paper trades, monitors performance
 * Links to enhanced research signals
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = path.join(__dirname, 'paper_trading.json');
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');

// Load current state
function loadState() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return createDefaultState();
  }
}

function saveState(state) {
  state._meta.last_updated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function createDefaultState() {
  return {
    account: {
      starting_balance: 100000,
      current_balance: 100000,
      total_pnl: 0,
      total_pnl_pct: 0,
      open_positions: 0,
      closed_trades: 0,
      winning_trades: 0,
      losing_trades: 0
    },
    positions: [],
    trade_history: [],
    active_signals: [],
    _meta: {
      version: "1.0",
      created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      system: "Enhanced Research v2.0"
    }
  };
}

// Fetch current price
async function fetchPrice(symbol) {
  const symbols = {
    'BTC': 'BTC/USD',
    'ETH': 'ETH/USD',
    'MSTR': 'MSTR',
    'HIMS': 'HIMS'
  };
  
  const url = `https://api.twelvedata.com/price?symbol=${symbols[symbol]}&apikey=${TWELVE_DATA_KEY}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parseFloat(parsed.price));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Open a new position
function openPosition(state, signal, allocationPct = 10) {
  const price = signal.entry_price;
  const allocation = state.account.current_balance * (allocationPct / 100);
  const shares = Math.floor(allocation / price);
  const cost = shares * price;
  
  const position = {
    id: signal.id,
    symbol: signal.symbol,
    entry_date: new Date().toISOString(),
    entry_price: price,
    current_price: price,
    shares: shares,
    cost_basis: cost,
    target_price: signal.target_price,
    stop_loss: signal.stop_loss,
    signal_type: signal.signal_type,
    confidence: signal.confidence,
    catalyst: signal.catalyst,
    unrealized_pnl: 0,
    unrealized_pnl_pct: 0,
    status: 'OPEN',
    days_held: 0
  };
  
  state.positions.push(position);
  state.account.current_balance -= cost;
  state.account.open_positions++;
  
  // Update signal
  signal.status = 'ENTERED';
  signal.shares = shares;
  signal.allocated = cost;
  
  console.log(`✅ OPENED: ${shares} shares ${signal.symbol} @ $${price}`);
  console.log(`   Cost: $${cost.toFixed(2)} | Target: $${signal.target_price} | Stop: $${signal.stop_loss}`);
  
  return position;
}

// Close a position
function closePosition(state, positionId, reason) {
  const idx = state.positions.findIndex(p => p.id === positionId);
  if (idx === -1) return null;
  
  const position = state.positions[idx];
  const currentPrice = position.current_price;
  const proceeds = position.shares * currentPrice;
  const pnl = proceeds - position.cost_basis;
  const pnlPct = (pnl / position.cost_basis) * 100;
  
  const trade = {
    ...position,
    exit_date: new Date().toISOString(),
    exit_price: currentPrice,
    proceeds: proceeds,
    realized_pnl: pnl,
    realized_pnl_pct: pnlPct,
    exit_reason: reason
  };
  
  state.trade_history.push(trade);
  state.positions.splice(idx, 1);
  
  // Update account
  state.account.current_balance += proceeds;
  state.account.open_positions--;
  state.account.closed_trades++;
  state.account.total_pnl += pnl;
  state.account.total_pnl_pct = (state.account.total_pnl / state.account.starting_balance) * 100;
  
  if (pnl > 0) {
    state.account.winning_trades++;
  } else {
    state.account.losing_trades++;
  }
  
  const emoji = pnl >= 0 ? '✅' : '❌';
  console.log(`${emoji} CLOSED: ${position.symbol} @ $${currentPrice} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
  console.log(`   Reason: ${reason} | P&L: $${pnl.toFixed(2)}`);
  
  return trade;
}

// Update all positions with current prices
async function updatePositions(state) {
  console.log('\n📊 UPDATING POSITIONS...\n');
  
  for (const position of state.positions) {
    try {
      const currentPrice = await fetchPrice(position.symbol);
      position.current_price = currentPrice;
      
      const pnl = (currentPrice - position.entry_price) * position.shares;
      const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
      
      position.unrealized_pnl = pnl;
      position.unrealized_pnl_pct = pnlPct;
      position.days_held = Math.floor((Date.now() - new Date(position.entry_date).getTime()) / (1000 * 60 * 60 * 24));
      
      // Check exit conditions
      if (currentPrice >= position.target_price) {
        closePosition(state, position.id, 'TARGET_HIT');
      } else if (currentPrice <= position.stop_loss) {
        closePosition(state, position.id, 'STOP_LOSS');
      }
    } catch (e) {
      console.log(`⚠️  Could not update ${position.symbol}: ${e.message}`);
    }
  }
}

// Display status
function displayStatus(state) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           PAPER TRADING ACCOUNT                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const acc = state.account;
  console.log(`\n💰 ACCOUNT SUMMARY:`);
  console.log(`   Starting Balance: $${acc.starting_balance.toLocaleString()}`);
  console.log(`   Current Balance:  $${acc.current_balance.toLocaleString()}`);
  console.log(`   Total P&L:        $${acc.total_pnl.toFixed(2)} (${acc.total_pnl_pct >= 0 ? '+' : ''}${acc.total_pnl_pct.toFixed(2)}%)`);
  console.log(`   Open Positions:   ${acc.open_positions}`);
  console.log(`   Closed Trades:    ${acc.closed_trades} (${acc.winning_trades}W / ${acc.losing_trades}L)`);
  
  if (acc.closed_trades > 0) {
    const winRate = (acc.winning_trades / acc.closed_trades * 100).toFixed(1);
    console.log(`   Win Rate:         ${winRate}%`);
  }
  
  if (state.positions.length > 0) {
    console.log(`\n📈 OPEN POSITIONS:`);
    state.positions.forEach(p => {
      const emoji = p.unrealized_pnl >= 0 ? '🟢' : '🔴';
      console.log(`   ${emoji} ${p.symbol}: ${p.shares} shares @ $${p.entry_price} → $${p.current_price}`);
      console.log(`      P&L: ${p.unrealized_pnl >= 0 ? '+' : ''}${p.unrealized_pnl_pct.toFixed(2)}% ($${p.unrealized_pnl.toFixed(2)})`);
      console.log(`      Days held: ${p.days_held} | Target: $${p.target_price} | Stop: $${p.stop_loss}`);
    });
  }
  
  if (state.active_signals.length > 0) {
    console.log(`\n🎯 ACTIVE SIGNALS (Not Entered):`);
    state.active_signals
      .filter(s => s.status === 'ACTIVE')
      .forEach(s => {
        console.log(`   • ${s.symbol}: ${s.signal_type} @ $${s.entry_price}`);
        console.log(`     Target: $${s.target_price} | Stop: $${s.stop_loss} | ${s.confidence} confidence`);
      });
  }
  
  if (state.trade_history.length > 0) {
    console.log(`\n📋 RECENT CLOSED TRADES:`);
    state.trade_history.slice(-5).forEach(t => {
      const emoji = t.realized_pnl >= 0 ? '✅' : '❌';
      console.log(`   ${emoji} ${t.symbol}: ${t.realized_pnl >= 0 ? '+' : ''}${t.realized_pnl_pct.toFixed(2)}% | ${t.exit_reason}`);
    });
  }
  
  console.log('\n' + '═'.repeat(64));
}

// Execute entry from active signals
function executeActiveSignals(state, symbolFilter = null) {
  console.log('\n🚀 EXECUTING ACTIVE SIGNALS...\n');
  
  const toEnter = state.active_signals.filter(s => {
    if (s.status !== 'ACTIVE') return false;
    if (symbolFilter && s.symbol !== symbolFilter) return false;
    return true;
  });
  
  if (toEnter.length === 0) {
    console.log('No active signals to enter.');
    return;
  }
  
  toEnter.forEach(signal => {
    // Determine allocation based on signal strength
    let allocation = 10; // Default
    if (signal.signal_type === 'STRONG_BUY') allocation = 15;
    if (signal.signal_type === 'WEAK_BUY') allocation = 8;
    if (signal.signal_type === 'BUY') allocation = 12;
    if (signal.confidence === 'HIGH') allocation += 2;
    
    openPosition(state, signal, allocation);
  });
}

// Add new signal from enhanced research
function addSignal(state, signalData) {
  const id = `${signalData.symbol}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(state.active_signals.length + 1).padStart(3,'0')}`;
  
  const signal = {
    id,
    symbol: signalData.symbol,
    signal_date: new Date().toISOString().slice(0,10),
    signal_time: new Date().toTimeString().slice(0,8),
    signal_type: signalData.signal_type,
    entry_price: signalData.entry_price,
    current_price: signalData.entry_price,
    target_price: signalData.target_price,
    stop_loss: signalData.stop_loss,
    timeframe: signalData.timeframe,
    catalyst: signalData.catalyst || '',
    urgency: signalData.urgency,
    confidence: signalData.confidence,
    factors: signalData.factors || [],
    status: 'ACTIVE',
    shares: 0,
    allocated: 0,
    notes: signalData.notes || ''
  };
  
  state.active_signals.push(signal);
  console.log(`✅ SIGNAL ADDED: ${signal.symbol} ${signal.signal_type} @ $${signal.entry_price}`);
  return signal;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  const state = loadState();
  
  switch (command) {
    case 'status':
      await updatePositions(state);
      displayStatus(state);
      break;
      
    case 'enter':
    case 'buy':
      executeActiveSignals(state, args[1]);
      await updatePositions(state);
      displayStatus(state);
      break;
      
    case 'close':
    case 'sell':
      const symbol = args[1];
      const positions = state.positions.filter(p => !symbol || p.symbol === symbol);
      if (positions.length === 0) {
        console.log(`No open positions${symbol ? ` for ${symbol}` : ''}`);
      } else {
        positions.forEach(p => closePosition(state, p.id, 'MANUAL_CLOSE'));
      }
      await updatePositions(state);
      displayStatus(state);
      break;
      
    case 'add':
      // Usage: node paper_trade_manager.js add BTC BUY 65000 70000 60000 "Some notes"
      const newSignal = {
        symbol: args[1],
        signal_type: args[2],
        entry_price: parseFloat(args[3]),
        target_price: parseFloat(args[4]),
        stop_loss: parseFloat(args[5]),
        timeframe: args[6] || '2-3 weeks',
        catalyst: args[7] || '',
        urgency: 'THIS WEEK',
        confidence: 'MEDIUM',
        factors: [],
        notes: args.slice(8).join(' ') || ''
      };
      addSignal(state, newSignal);
      break;
      
    default:
      console.log('Commands: status, enter [symbol], close [symbol], add <symbol> <type> <entry> <target> <stop>');
  }
  
  saveState(state);
}

module.exports = { loadState, saveState, openPosition, closePosition, updatePositions, addSignal };

if (require.main === module) main();
