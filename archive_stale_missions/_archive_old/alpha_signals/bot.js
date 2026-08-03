/**
 * ALPHA SIGNALS BOT - Main Bot Controller
 * Connects signal generation to Telegram output
 */

const { generateAllSignals } = require('./signal_generator');
const { formatDailyReport, formatSummary, formatUrgentAlert } = require('./telegram_formatter');
const path = require('path');
const fs = require('fs');

// Bot configuration
const CONFIG = {
  // Bot identity
  name: 'Alpha Signals Bot',
  version: '1.0.0',
  
  // Assets to monitor
  assets: ['BTC', 'ETH', 'MSTR', 'HIMS', 'COIN', 'TSLA'],
  
  // Signal thresholds for alerts
  alertThreshold: {
    strongBuy: 3,
    buy: 2,
    strongSell: -3,
    sell: -2
  },
  
  // Data paths
  dataDir: path.join(__dirname, 'data'),
  historyFile: path.join(__dirname, 'data', 'signal_history.json'),
  configFile: path.join(__dirname, 'config.json'),
  
  // Output
  outputMode: 'console', // 'console' | 'telegram' | 'file'
  telegramChatId: null // Set via config
};

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(CONFIG.dataDir)) {
    fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  }
}

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG.configFile)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG.configFile, 'utf8'));
      Object.assign(CONFIG, cfg);
      console.log('✅ Config loaded from', CONFIG.configFile);
    }
  } catch (e) {
    console.warn('⚠️ Could not load config:', e.message);
  }
}

// Save signal to history
function saveSignalHistory(signals) {
  ensureDataDir();
  
  let history = [];
  try {
    if (fs.existsSync(CONFIG.historyFile)) {
      history = JSON.parse(fs.readFileSync(CONFIG.historyFile, 'utf8'));
    }
  } catch (e) {
    console.warn('⚠️ Could not load history:', e.message);
  }
  
  // Add new entry
  history.push({
    timestamp: new Date().toISOString(),
    signals: signals.map(s => ({
      symbol: s.symbol,
      signal: s.signal,
      score: s.score,
      confidence: s.confidence,
      price: s.price,
      change24h: s.change24h
    }))
  });
  
  // Keep last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  history = history.filter(h => new Date(h.timestamp) > cutoff);
  
  // Save
  fs.writeFileSync(CONFIG.historyFile, JSON.stringify(history, null, 2));
  console.log(`💾 Signal history saved (${history.length} entries)`);
  
  return history;
}

// Detect signal changes for alerts
function detectChanges(currentSignals, history) {
  if (!history || history.length < 2) return [];
  
  const previous = history[history.length - 2]?.signals || [];
  const changes = [];
  
  currentSignals.forEach(current => {
    const prev = previous.find(p => p.symbol === current.symbol);
    if (!prev) return;
    
    // Detect significant changes
    const scoreDiff = current.score - prev.score;
    const signalChanged = current.signal !== prev.signal;
    
    // Alert on signal changes or large score moves
    if (signalChanged || Math.abs(scoreDiff) >= 2) {
      changes.push({
        symbol: current.symbol,
        name: current.name,
        fromSignal: prev.signal,
        toSignal: current.signal,
        fromScore: prev.score,
        toScore: current.score,
        scoreDiff,
        isUpgrade: current.score > prev.score,
        isUrgent: Math.abs(current.score) >= 2
      });
    }
  });
  
  return changes;
}

// Send output to configured destination
async function sendOutput(message, options = {}) {
  const mode = options.mode || CONFIG.outputMode;
  
  switch (mode) {
    case 'telegram':
      return sendTelegramMessage(message, options);
    case 'file':
      return saveToFile(message, options);
    case 'console':
    default:
      console.log(message);
      return { success: true, mode: 'console' };
  }
}

// Telegram output (placeholder for actual integration)
async function sendTelegramMessage(message, options = {}) {
  const chatId = options.chatId || CONFIG.telegramChatId;
  
  if (!chatId) {
    console.warn('⚠️ No Telegram chat ID configured');
    console.log(message);
    return { success: false, error: 'No chat ID' };
  }
  
  // This would integrate with actual Telegram bot API
  // For now, log the formatted message
  console.log(`📤 Would send to Telegram chat ${chatId}:`);
  console.log(message);
  
  return { success: true, mode: 'telegram', chatId };
}

// Save to file
async function saveToFile(message, options = {}) {
  ensureDataDir();
  const filename = options.filename || `signal_report_${new Date().toISOString().split('T')[0]}.txt`;
  const filepath = path.join(CONFIG.dataDir, filename);
  
  fs.writeFileSync(filepath, message);
  console.log(`💾 Report saved to ${filepath}`);
  
  return { success: true, mode: 'file', filepath };
}

// Main bot run function
async function run(options = {}) {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log(`  🤖 ALPHA SIGNALS BOT v${CONFIG.version}`);
  console.log(`  📅 ${new Date().toLocaleString()}`);
  console.log('='.repeat(60) + '\n');
  
  // Load config
  loadConfig();
  
  // Generate signals
  const signals = await generateAllSignals({
    symbols: options.symbols || CONFIG.assets,
    skipDelay: options.skipDelay
  });
  
  // Save to history
  const history = saveSignalHistory(signals);
  
  // Detect changes
  const changes = detectChanges(signals, history);
  if (changes.length > 0) {
    console.log(`\n🔄 Signal Changes Detected: ${changes.length}`);
    changes.forEach(c => {
      const arrow = c.isUpgrade ? '⬆️' : '⬇️';
      console.log(`   ${arrow} ${c.symbol}: ${c.fromSignal} → ${c.toSignal} (${c.scoreDiff > 0 ? '+' : ''}${c.scoreDiff})`);
    });
  }
  
  // Format output based on mode
  let message;
  if (options.urgentOnly) {
    // Only send urgent signals
    const urgentSignals = signals.filter(s => 
      s.score >= CONFIG.alertThreshold.strongBuy || 
      s.score <= CONFIG.alertThreshold.strongSell
    );
    if (urgentSignals.length === 0) {
      console.log('⏸️ No urgent signals to report');
      return { signals, history, changes: [], sent: false };
    }
    message = urgentSignals.map(s => formatUrgentAlert(s)).join('\n\n---\n\n');
  } else if (options.summary) {
    message = formatSummary(signals);
  } else {
    message = formatDailyReport(signals, options);
  }
  
  // Send output
  const result = await sendOutput(message, options);
  
  const duration = Date.now() - startTime;
  console.log(`\n✅ Bot run complete in ${duration}ms`);
  console.log(`   Signals generated: ${signals.length}`);
  console.log(`   Changes detected: ${changes.length}`);
  console.log(`   Output mode: ${result.mode}`);
  
  return {
    signals,
    history,
    changes,
    sent: result.success,
    duration,
    mode: result.mode
  };
}

// Scheduled daily run (for cron/Task Scheduler)
async function dailyRun() {
  console.log('\n🕐 Running scheduled daily signal report...');
  return run({ summary: false });
}

// Quick check for alerts
async function alertCheck() {
  console.log('\n🔍 Running alert check...');
  return run({ urgentOnly: true });
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  switch (command) {
    case 'run':
      await run({ summary: args.includes('--summary') });
      break;
    case 'daily':
      await dailyRun();
      break;
    case 'alert':
      await alertCheck();
      break;
    case 'config':
      console.log('Current config:', JSON.stringify(CONFIG, null, 2));
      break;
    default:
      console.log(`
Alpha Signals Bot v${CONFIG.version}

Usage:
  node bot.js [command] [options]

Commands:
  run         Generate and display signals (default)
  daily       Run full daily report
  alert       Check for urgent signals only
  config      Show current configuration

Options:
  --summary   Output compact summary
  --json      Output raw JSON
      `);
  }
}

module.exports = {
  run,
  dailyRun,
  alertCheck,
  sendOutput,
  CONFIG
};

if (require.main === module) main();
