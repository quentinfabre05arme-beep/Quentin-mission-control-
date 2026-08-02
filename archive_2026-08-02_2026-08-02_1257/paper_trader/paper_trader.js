#!/usr/bin/env node
/**
 * Paper Trader — Safe trading practice engine
 * Simulates trades, tracks virtual portfolio, calculates P&L
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'memory');
const TRADES_DIR = path.join(DATA_DIR, 'trades');
const PERF_DIR = path.join(DATA_DIR, 'performance');
const STATE_FILE = path.join(__dirname, 'team_state.json');

function ensureDirs() {
  [DATA_DIR, TRADES_DIR, PERF_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  state.last_updated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadPrices() {
  // Try mission_control market data
  const mcPath = path.join(__dirname, '..', 'mission_control', 'market_data.json');
  if (fs.existsSync(mcPath)) {
    const md = JSON.parse(fs.readFileSync(mcPath, 'utf8'));
    const prices = {};
    for (const [k, v] of Object.entries(md)) {
      if (v && typeof v === 'object' && v.price) prices[k] = v.price;
      else if (typeof v === 'number') prices[k] = v;
    }
    if (Object.keys(prices).length > 0) return prices;
  }
  // Fallback: static sample prices for testing
  return {
    BTC: 67850.00,
    ETH: 3450.25,
    MSTR: 145.30,
    HIMS: 12.45
  };
}

function calculatePositionSize(state, entryPrice, stopLoss) {
  const riskAmount = state.capital.current_balance * (state.settings.risk_per_trade_percent / 100);
  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  if (riskPerUnit === 0) return 0;
  const positionSize = Math.floor(riskAmount / riskPerUnit);
  const totalCost = positionSize * entryPrice;
  if (totalCost > state.capital.available_cash) {
    return Math.floor(state.capital.available_cash / entryPrice);
  }
  return positionSize;
}

function buy(state, symbol, entryPrice, stopLoss, takeProfit, reason = '') {
  ensureDirs();
  if (state.positions.length >= state.settings.max_positions) {
    return { success: false, error: 'Max positions reached' };
  }
  if (state.positions.find(p => p.symbol === symbol)) {
    return { success: false, error: `Already holding ${symbol}` };
  }

  const quantity = calculatePositionSize(state, entryPrice, stopLoss);
  if (quantity <= 0) {
    return { success: false, error: 'Insufficient funds or invalid stop loss' };
  }

  const totalCost = quantity * entryPrice;
  state.capital.available_cash -= totalCost;

  const position = {
    id: `TRADE-${Date.now()}`,
    symbol,
    side: 'LONG',
    entry_price: entryPrice,
    quantity,
    total_cost: totalCost,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    opened_at: new Date().toISOString(),
    reason,
    status: 'OPEN'
  };

  state.positions.push(position);
  state.stats.total_trades++;
  saveState(state);

  // Log trade
  const tradeLog = {
    ...position,
    action: 'OPEN',
    log_time: new Date().toISOString()
  };
  const logFile = path.join(TRADES_DIR, `${new Date().toISOString().split('T')[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(tradeLog) + '\n');

  return { success: true, position };
}

function closePosition(state, symbol, exitPrice, reason = '') {
  ensureDirs();
  const idx = state.positions.findIndex(p => p.symbol === symbol);
  if (idx === -1) {
    return { success: false, error: `No open position for ${symbol}` };
  }

  const pos = state.positions[idx];
  const proceeds = pos.quantity * exitPrice;
  const pnl = proceeds - pos.total_cost;
  const pnlPercent = (pnl / pos.total_cost) * 100;

  state.capital.available_cash += proceeds;
  state.capital.total_pnl += pnl;
  state.capital.current_balance = state.capital.starting_balance + state.capital.total_pnl;
  state.capital.total_pnl_percent = (state.capital.total_pnl / state.capital.starting_balance) * 100;

  // Update stats
  if (pnl > 0) state.stats.winning_trades++;
  else state.stats.losing_trades++;
  state.stats.win_rate = state.stats.total_trades > 0
    ? (state.stats.winning_trades / state.stats.total_trades) * 100
    : 0;
  state.stats.avg_pnl_per_trade = state.stats.total_trades > 0
    ? state.capital.total_pnl / state.stats.total_trades
    : 0;

  const closedTrade = {
    ...pos,
    exit_price: exitPrice,
    proceeds,
    pnl,
    pnl_percent: pnlPercent,
    closed_at: new Date().toISOString(),
    close_reason: reason,
    status: 'CLOSED'
  };

  state.closed_trades.push(closedTrade);
  state.positions.splice(idx, 1);
  saveState(state);

  // Log trade
  const tradeLog = {
    ...closedTrade,
    action: 'CLOSE',
    log_time: new Date().toISOString()
  };
  const logFile = path.join(TRADES_DIR, `${new Date().toISOString().split('T')[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(tradeLog) + '\n');

  return { success: true, trade: closedTrade, pnl, pnlPercent };
}

function updatePositions(state) {
  const prices = loadPrices();
  let totalUnrealized = 0;
  const updated = state.positions.map(p => {
    const currentPrice = prices[p.symbol] || p.entry_price;
    const marketValue = p.quantity * currentPrice;
    const unrealized = marketValue - p.total_cost;
    const unrealizedPercent = (unrealized / p.total_cost) * 100;
    totalUnrealized += unrealized;

    // Check if stop loss or take profit hit
    const hitSL = p.side === 'LONG' && currentPrice <= p.stop_loss;
    const hitTP = p.side === 'LONG' && currentPrice >= p.take_profit;

    return {
      ...p,
      current_price: currentPrice,
      market_value: marketValue,
      unrealized_pnl: unrealized,
      unrealized_pnl_percent: unrealizedPercent,
      hit_stop_loss: hitSL,
      hit_take_profit: hitTP
    };
  });

  return { positions: updated, totalUnrealizedPnL: totalUnrealized };
}

function generateReport(state) {
  ensureDirs();
  const prices = loadPrices();
  const { positions, totalUnrealizedPnL } = updatePositions(state);

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const report = {
    generated_at: now,
    summary: {
      starting_balance: state.capital.starting_balance,
      current_balance: state.capital.current_balance,
      available_cash: state.capital.available_cash,
      total_pnl: state.capital.total_pnl,
      total_pnl_percent: state.capital.total_pnl_percent,
      unrealized_pnl: totalUnrealizedPnL,
      total_equity: state.capital.available_cash + positions.reduce((s, p) => s + p.market_value, 0)
    },
    stats: state.stats,
    open_positions: positions,
    closed_trades: state.closed_trades.slice(-10),
    prices
  };

  const reportFile = path.join(PERF_DIR, `report-${today}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  // Text summary
  let text = `
╔══════════════════════════════════════════════════════════╗
║           PAPER TRADER PERFORMANCE REPORT                ║
╠══════════════════════════════════════════════════════════╣
Generated: ${now}

--- CAPITAL SUMMARY ---
Starting Balance: $${state.capital.starting_balance.toLocaleString()}
Current Balance:  $${state.capital.current_balance.toLocaleString()}
Available Cash:   $${state.capital.available_cash.toLocaleString()}
Realized P&L:     $${state.capital.total_pnl.toFixed(2)} (${state.capital.total_pnl_percent.toFixed(2)}%)
Unrealized P&L:   $${totalUnrealizedPnL.toFixed(2)}
Total Equity:     $${report.summary.total_equity.toLocaleString()}

--- TRADE STATISTICS ---
Total Trades:     ${state.stats.total_trades}
Winning:          ${state.stats.winning_trades}
Losing:           ${state.stats.losing_trades}
Win Rate:         ${state.stats.win_rate.toFixed(1)}%
Avg P&L/Trade:    $${state.stats.avg_pnl_per_trade.toFixed(2)}

--- OPEN POSITIONS (${positions.length}) ---
`;
  if (positions.length === 0) {
    text += 'No open positions\n';
  } else {
    positions.forEach(p => {
      text += `${p.symbol} | ${p.side} | Qty: ${p.quantity} | Entry: $${p.entry_price.toFixed(2)} | Current: $${p.current_price.toFixed(2)} | Unrealized: $${p.unrealized_pnl.toFixed(2)} (${p.unrealized_pnl_percent.toFixed(2)}%)\n`;
      if (p.hit_stop_loss) text += `   ⚠️ STOP LOSS HIT!\n`;
      if (p.hit_take_profit) text += `   🎯 TAKE PROFIT HIT!\n`;
    });
  }

  text += `
--- RECENT CLOSED TRADES ---\n`;
  if (state.closed_trades.length === 0) {
    text += 'No closed trades yet\n';
  } else {
    state.closed_trades.slice(-5).forEach(t => {
      const emoji = t.pnl >= 0 ? '✅' : '❌';
      text += `${emoji} ${t.symbol} | P&L: $${t.pnl.toFixed(2)} (${t.pnl_percent.toFixed(2)}%) | ${t.close_reason || 'Manual'}\n`;
    });
  }

  text += `
--- MARKET PRICES ---\n`;
  for (const [sym, price] of Object.entries(prices)) {
    text += `${sym}: $${price.toLocaleString()}\n`;
  }

  text += `╚══════════════════════════════════════════════════════════╝\n`;

  const textFile = path.join(PERF_DIR, `report-${today}.txt`);
  fs.writeFileSync(textFile, text);

  return { report, text, reportFile, textFile };
}

// CLI
function showHelp() {
  console.log(`
Paper Trader CLI
Usage:
  node paper_trader.js status              Show portfolio status
  node paper_trader.js report              Generate performance report
  node paper_trader.js buy <SYMBOL> <ENTRY> <STOP> <TP> [REASON]
  node paper_trader.js sell <SYMBOL> <EXIT> [REASON]
  node paper_trader.js test                Run sample trades test
  node paper_trader.js reset               Reset to starting capital
`);
}

function main() {
  ensureDirs();
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help') {
    showHelp();
    return;
  }

  if (cmd === 'reset') {
    const fresh = {
      mission: 'paper_trader',
      status: 'active',
      created: '2026-07-26',
      last_updated: '2026-07-26',
      capital: { starting_balance: 100000, current_balance: 100000, available_cash: 100000, total_pnl: 0, total_pnl_percent: 0 },
      settings: { risk_per_trade_percent: 5, max_positions: 4, track_assets: ['BTC', 'ETH', 'MSTR', 'HIMS'] },
      stats: { total_trades: 0, winning_trades: 0, losing_trades: 0, win_rate: 0, avg_pnl_per_trade: 0, max_drawdown: 0 },
      positions: [],
      closed_trades: []
    };
    saveState(fresh);
    console.log('✅ Paper trader reset to $100,000');
    return;
  }

  let state;
  try {
    state = loadState();
  } catch (e) {
    console.error('Error loading state:', e.message);
    process.exit(1);
  }

  if (cmd === 'status') {
    const prices = loadPrices();
    const { positions, totalUnrealizedPnL } = updatePositions(state);
    const totalEquity = state.capital.available_cash + positions.reduce((s, p) => s + (p.market_value || 0), 0);

    console.log(`\n📊 Paper Trader Status`);
    console.log(`─────────────────────────────────`);
    console.log(`Balance:      $${state.capital.current_balance.toLocaleString()}`);
    console.log(`Cash:         $${state.capital.available_cash.toLocaleString()}`);
    console.log(`Realized P&L: $${state.capital.total_pnl.toFixed(2)} (${state.capital.total_pnl_percent.toFixed(2)}%)`);
    console.log(`Unrealized:   $${totalUnrealizedPnL.toFixed(2)}`);
    console.log(`Equity:       $${totalEquity.toLocaleString()}`);
    console.log(`Trades:       ${state.stats.total_trades} (W: ${state.stats.winning_trades} / L: ${state.stats.losing_trades})`);
    console.log(`Win Rate:     ${state.stats.win_rate.toFixed(1)}%`);
    console.log(`\n📈 Open Positions: ${positions.length}`);
    positions.forEach(p => {
      const indicator = p.unrealized_pnl >= 0 ? '🟢' : '🔴';
      console.log(`   ${indicator} ${p.symbol} ${p.quantity} @ $${p.entry_price.toFixed(2)} → $${p.current_price.toFixed(2)} | P&L: $${p.unrealized_pnl.toFixed(2)}`);
    });
    console.log(`\n💰 Prices:`, prices);
    console.log();
    return;
  }

  if (cmd === 'buy') {
    const [symbol, entry, stop, tp, ...reasonParts] = args.slice(1);
    if (!symbol || !entry || !stop || !tp) {
      console.error('Usage: buy <SYMBOL> <ENTRY_PRICE> <STOP_LOSS> <TAKE_PROFIT> [REASON]');
      process.exit(1);
    }
    const result = buy(state, symbol.toUpperCase(), parseFloat(entry), parseFloat(stop), parseFloat(tp), reasonParts.join(' '));
    if (result.success) {
      console.log(`✅ BUY ${symbol.toUpperCase()}`);
      console.log(`   Entry: $${result.position.entry_price} | Stop: $${result.position.stop_loss} | TP: $${result.position.take_profit}`);
      console.log(`   Qty: ${result.position.quantity} | Cost: $${result.position.total_cost.toFixed(2)}`);
    } else {
      console.error(`❌ Buy failed: ${result.error}`);
    }
    return;
  }

  if (cmd === 'sell') {
    const [symbol, exit, ...reasonParts] = args.slice(1);
    if (!symbol || !exit) {
      console.error('Usage: sell <SYMBOL> <EXIT_PRICE> [REASON]');
      process.exit(1);
    }
    const result = closePosition(state, symbol.toUpperCase(), parseFloat(exit), reasonParts.join(' '));
    if (result.success) {
      const emoji = result.pnl >= 0 ? '🟢' : '🔴';
      console.log(`${emoji} SELL ${symbol.toUpperCase()}`);
      console.log(`   Exit: $${result.trade.exit_price} | P&L: $${result.pnl.toFixed(2)} (${result.pnlPercent.toFixed(2)}%)`);
    } else {
      console.error(`❌ Sell failed: ${result.error}`);
    }
    return;
  }

  if (cmd === 'report') {
    const { text } = generateReport(state);
    console.log(text);
    return;
  }

  if (cmd === 'test') {
    console.log('🧪 Running sample trades test...\n');
    // Reset for clean test
    const testState = {
      mission: 'paper_trader',
      status: 'active',
      created: '2026-07-26',
      last_updated: '2026-07-26',
      capital: { starting_balance: 100000, current_balance: 100000, available_cash: 100000, total_pnl: 0, total_pnl_percent: 0 },
      settings: { risk_per_trade_percent: 5, max_positions: 4, track_assets: ['BTC', 'ETH', 'MSTR', 'HIMS'] },
      stats: { total_trades: 0, winning_trades: 0, losing_trades: 0, win_rate: 0, avg_pnl_per_trade: 0, max_drawdown: 0 },
      positions: [],
      closed_trades: []
    };

    console.log('1️⃣ Buying BTC at $67,850 with stop at $65,000 and TP at $72,000');
    const r1 = buy(testState, 'BTC', 67850, 65000, 72000, 'STRONG BUY signal');
    console.log(r1.success ? `   ✅ Opened ${r1.position.id}` : `   ❌ ${r1.error}`);

    console.log('\n2️⃣ Buying ETH at $3,450 with stop at $3,200 and TP at $3,800');
    const r2 = buy(testState, 'ETH', 3450.25, 3200, 3800, 'Momentum breakout');
    console.log(r2.success ? `   ✅ Opened ${r2.position.id}` : `   ❌ ${r2.error}`);

    console.log('\n3️⃣ Selling BTC at $71,500 (take profit hit)');
    const r3 = closePosition(testState, 'BTC', 71500, 'Take profit hit');
    console.log(r3.success ? `   🟢 Closed with P&L: $${r3.pnl.toFixed(2)}` : `   ❌ ${r3.error}`);

    console.log('\n4️⃣ Selling ETH at $3,300 (stop loss hit)');
    const r4 = closePosition(testState, 'ETH', 3300, 'Stop loss hit');
    console.log(r4.success ? `   🔴 Closed with P&L: $${r4.pnl.toFixed(2)}` : `   ❌ ${r4.error}`);

    console.log('\n5️⃣ Buying MSTR at $145 with stop at $130 and TP at $170');
    const r5 = buy(testState, 'MSTR', 145.30, 130, 170, 'Technical breakout');
    console.log(r5.success ? `   ✅ Opened ${r5.position.id}` : `   ❌ ${r5.error}`);

    console.log('\n--- FINAL REPORT ---');
    const { text } = generateReport(testState);
    console.log(text);

    console.log('\n✅ Test complete! Trades logged to memory/trades/ and memory/performance/');
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  showHelp();
}

if (require.main === module) {
  main();
}

module.exports = { buy, sell: closePosition, updatePositions, generateReport, loadState, loadPrices };
