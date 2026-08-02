/**
 * SIGNAL BRIDGE — Connects Enhanced Research v2.0 to Alpha Signals Bot
 * Reads output from enhanced_research.js and converts to bot-compatible signals
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESEARCH_DIR = path.join(__dirname, '..', '..', 'mission_control');
const SIGNALS_FILE = path.join(__dirname, 'data', 'signals_from_research.json');

// Map research ratings to bot signals
const RATING_MAP = {
  'STRONG BUY':  { rating: 'STRONG_BUY', score: 3, confidence: 'HIGH' },
  'BUY':         { rating: 'BUY', score: 2, confidence: 'MEDIUM' },
  'WEAK BUY':    { rating: 'WEAK_BUY', score: 1, confidence: 'MEDIUM' },
  'HOLD':        { rating: 'HOLD', score: 0, confidence: 'MEDIUM' },
  'WEAK SELL':   { rating: 'WEAK_SELL', score: -1, confidence: 'LOW' },
  'SELL':        { rating: 'SELL', score: -2, confidence: 'MEDIUM' },
  'STRONG SELL': { rating: 'STRONG_SELL', score: -3, confidence: 'HIGH' },
};

const TRACKED_ASSETS = ['BTC', 'ETH', 'SOL', 'MSTR', 'HIMS', 'COIN', 'TSLA', 'PLTR', 'CRWD', 'SNOW', 'NVDA', 'AMD', 'META', 'AAPL', 'LLY'];

/**
 * Run enhanced research and capture output
 */
function runResearch(symbol) {
  try {
    const output = execSync(
      `cd "${RESEARCH_DIR}" && node enhanced_research.js ${symbol} --json`,
      { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
    );
    return JSON.parse(output);
  } catch (e) {
    console.error(`Research failed for ${symbol}:`, e.message);
    return null;
  }
}

/**
 * Convert research output to bot signal
 */
function convertToSignal(researchOutput) {
  if (!researchOutput || !researchOutput.composite) return null;
  
  const c = researchOutput.composite;
  const price = researchOutput.data?.price?.price || 0;
  const change24h = researchOutput.data?.price?.change_24h || 0;
  
  const mapped = RATING_MAP[c.rating] || RATING_MAP['HOLD'];
  
  // Get existing position info if available
  const portfolioFile = path.join(__dirname, '..', 'paper_trading', 'PAPER_PORTFOLIO.json');
  let existingPosition = null;
  if (fs.existsSync(portfolioFile)) {
    const portfolio = JSON.parse(fs.readFileSync(portfolioFile, 'utf8'));
    existingPosition = portfolio.positions.find(p => p.ticker === researchOutput.symbol);
  }
  
  return {
    ticker: researchOutput.symbol,
    price,
    change24h,
    score: mapped.score,
    rawScore: parseFloat(c.rawScore) || 0,
    rating: mapped.rating,
    action: mapped.score > 0 ? 'BUY' : mapped.score < 0 ? 'SELL' : 'HOLD',
    confidence: c.confidence || mapped.confidence,
    factors: c.factors || [],
    research_time_ms: researchOutput.total_time_ms,
    timestamp: new Date().toISOString(),
    // Include full research context for transparency
    technical_rating: researchOutput.data?.technical?.composite?.rating,
    sentiment_rating: researchOutput.data?.sentiment?.summary?.rating,
    existing_position: existingPosition ? {
      shares: existingPosition.shares,
      entryPrice: existingPosition.entryPrice,
      unrealizedPnl: existingPosition.unrealizedPnl,
    } : null,
  };
}

/**
 * Generate signals from full research pipeline
 */
async function generateSignalsFromResearch() {
  console.log('\n🔬 RUNNING FULL RESEARCH PIPELINE...\n');
  
  const signals = [];
  
  for (const symbol of TRACKED_ASSETS) {
    process.stdout.write(`Analyzing ${symbol}... `);
    const research = runResearch(symbol);
    
    if (research) {
      const signal = convertToSignal(research);
      if (signal) {
        signals.push(signal);
        const emoji = signal.action === 'BUY' ? '🟢' : signal.action === 'SELL' ? '🔴' : '⚪';
        console.log(`${emoji} ${signal.rating} (Score: ${signal.score})`);
      }
    } else {
      console.log('❌ Failed');
    }
    
    // Small delay to respect API limits
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Save signals
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const existing = fs.existsSync(SIGNALS_FILE) 
    ? JSON.parse(fs.readFileSync(SIGNALS_FILE, 'utf8')) 
    : { signals: [] };
  
  existing.signals.push(...signals);
  if (existing.signals.length > 500) {
    existing.signals = existing.signals.slice(-500);
  }
  
  fs.writeFileSync(SIGNALS_FILE, JSON.stringify(existing, null, 2));
  
  console.log(`\n💾 Saved ${signals.length} research-driven signals`);
  
  return signals;
}

/**
 * Get latest actionable signals (BUY only, no existing positions)
 */
function getActionableSignals(minScore = 1) {
  if (!fs.existsSync(SIGNALS_FILE)) return [];
  
  const data = JSON.parse(fs.readFileSync(SIGNALS_FILE, 'utf8'));
  const latest = {};
  
  // Get most recent signal per ticker
  for (const signal of data.signals) {
    if (!latest[signal.ticker] || new Date(signal.timestamp) > new Date(latest[signal.ticker].timestamp)) {
      latest[signal.ticker] = signal;
    }
  }
  
  // Filter to actionable BUY signals
  return Object.values(latest).filter(s => 
    s.action === 'BUY' && 
    s.score >= minScore &&
    s.confidence !== 'LOW'
  ).sort((a, b) => b.score - a.score);
}

/**
 * Show research-based signal report
 */
function showSignalReport() {
  const signals = getActionableSignals();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     RESEARCH-DRIVEN ALPHA SIGNALS                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  if (signals.length === 0) {
    console.log('\n⚠️ No actionable BUY signals from research');
    return;
  }
  
  console.log(`\n📈 TOP BUY SIGNALS (${signals.length}):`);
  signals.forEach((s, i) => {
    const emoji = s.rating === 'STRONG_BUY' ? '🔥' : s.rating === 'BUY' ? '✅' : '⚡';
    console.log(`\n${emoji} #${i+1} ${s.ticker}: ${s.rating} (Score: ${s.score}, ${s.confidence})`);
    console.log(`   Price: $${s.price?.toFixed(2) || 'N/A'} | 24h: ${s.change24h >= 0 ? '+' : ''}${s.change24h?.toFixed(1) || 0}%`);
    console.log(`   Technical: ${s.technical_rating || 'N/A'} | Sentiment: ${s.sentiment_rating || 'N/A'}`);
    if (s.existing_position) {
      console.log(`   ⚠️ Already holding: ${s.existing_position.shares} shares @ $${s.existing_position.entryPrice.toFixed(2)}`);
    }
    if (s.factors.length > 0) {
      console.log(`   Factors:`);
      s.factors.forEach(f => console.log(`      • ${f}`));
    }
  });
}

// ─── CLI ─────────────────────────────────────────────────────────

const command = process.argv[2];

(async () => {
  switch (command) {
    case 'run':
      await generateSignalsFromResearch();
      showSignalReport();
      break;
    case 'report':
      showSignalReport();
      break;
    case 'actionable':
      const actionable = getActionableSignals();
      console.log(JSON.stringify(actionable, null, 2));
      break;
    default:
      console.log('Signal Bridge — Connects Research v2.0 to Trading Bot');
      console.log('');
      console.log('Commands:');
      console.log('  run        - Run full research + generate signals');
      console.log('  report     - Show latest actionable signals');
      console.log('  actionable - Output JSON of actionable signals');
  }
})();

module.exports = {
  generateSignalsFromResearch,
  getActionableSignals,
  convertToSignal,
  showSignalReport,
};
