/**
 * ALPHA SIGNALS BOT - Telegram Message Formatter
 * Formats signals for Telegram with confidence levels and visual indicators
 */

const { ASSETS } = require('./signal_generator');

// Emoji constants
const EMOJI = {
  bot: '🤖',
  signal: '📊',
  buy: '🟢',
  sell: '🔴',
  hold: '⚪',
  confidence: {
    HIGH: '✅',
    MEDIUM: '⚠️',
    LOW: '❓'
  },
  price: '💰',
  trend: {
    up: '📈',
    down: '📉',
    neutral: '➡️'
  },
  clock: '🕐',
  fire: '🔥',
  warning: '⚡',
  chart: '📈',
  shield: '🛡️'
};

// Format single signal for Telegram
function formatSignal(signal) {
  const lines = [];
  
  // Header with signal strength
  const signalBars = signal.score >= 3 ? '▓▓▓▓▓' : 
                     signal.score >= 2 ? '▓▓▓▓░' :
                     signal.score >= 1 ? '▓▓▓░░' :
                     signal.score >= -1 ? '▓▓░░░' :
                     signal.score >= -2 ? '▓░░░░' : '░░░░░';
  
  lines.push(`\n${signal.emoji} <b>${signal.symbol}</b> — ${signal.name}`);
  lines.push(`${EMOJI.signal} <b>SIGNAL: ${signal.signal}</b>`);
  lines.push(`${signalBars} (Score: ${signal.score})`);
  
  // Price info
  if (signal.price) {
    const changeEmoji = (signal.change24h || 0) >= 0 ? EMOJI.trend.up : EMOJI.trend.down;
    const changeStr = signal.change24h >= 0 ? '+' : '';
    lines.push(`\n${EMOJI.price} Price: <b>$${signal.price.toLocaleString()}</b>`);
    lines.push(`${changeEmoji} 24h Change: ${changeStr}${(signal.change24h || 0).toFixed(2)}%`);
  }
  
  // Confidence
  const confEmoji = EMOJI.confidence[signal.confidence] || EMOJI.confidence.LOW;
  lines.push(`\n${confEmoji} Confidence: <b>${signal.confidence}</b>`);
  if (signal.confidenceFactors?.length > 0) {
    signal.confidenceFactors.forEach(f => lines.push(`   • ${f}`));
  }
  
  // Action and urgency
  lines.push(`\n${EMOJI.warning} Action: <b>${signal.action}</b>`);
  if (signal.urgency && signal.urgency !== 'NONE') {
    lines.push(`${EMOJI.fire} Urgency: ${signal.urgency}`);
  }
  
  // Reasons
  if (signal.reasons && signal.reasons.length > 0) {
    lines.push(`\n${EMOJI.chart} Key Factors:`);
    signal.reasons.forEach(r => lines.push(`   • ${r}`));
  }
  
  lines.push(''); // Spacer
  
  return lines.join('\n');
}

// Format full daily signal report
function formatDailyReport(signals, options = {}) {
  const lines = [];
  const now = new Date();
  
  // Header
  lines.push(`${EMOJI.bot} <b>ALPHA SIGNALS BOT</b> ${EMOJI.bot}`);
  lines.push(`═══════════════════════════════`);
  lines.push(`${EMOJI.clock} ${now.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`);
  lines.push('');
  
  // Summary stats
  const buySignals = signals.filter(s => s.score >= 2);
  const sellSignals = signals.filter(s => s.score <= -2);
  const holdSignals = signals.filter(s => s.score > -2 && s.score < 2);
  
  lines.push(`📊 <b>MARKET OVERVIEW</b>`);
  lines.push(`${EMOJI.buy} Buy Signals: ${buySignals.length}`);
  lines.push(`${EMOJI.sell} Sell Signals: ${sellSignals.length}`);
  lines.push(`${EMOJI.hold} Hold/Neutral: ${holdSignals.length}`);
  lines.push('');
  
  // Sort by score (strongest first)
  const sortedSignals = [...signals].sort((a, b) => b.score - a.score);
  
  // Top opportunities
  const topBuys = sortedSignals.filter(s => s.score >= 2);
  const topSells = sortedSignals.filter(s => s.score <= -2).reverse();
  
  if (topBuys.length > 0) {
    lines.push(`🔥 <b>TOP BUY OPPORTUNITIES</b>`);
    topBuys.forEach(s => {
      lines.push(`${s.emoji} ${s.symbol} — Score: ${s.score} | Conf: ${s.confidence}`);
      if (s.price) lines.push(`   💰 $${s.price.toLocaleString()} (${s.change24h >= 0 ? '+' : ''}${(s.change24h || 0).toFixed(2)}%)`);
      lines.push(`   ▶️ ${s.action}`);
      lines.push('');
    });
  }
  
  if (topSells.length > 0) {
    lines.push(`⚠️ <b>TOP SELL ALERTS</b>`);
    topSells.forEach(s => {
      lines.push(`${s.emoji} ${s.symbol} — Score: ${s.score} | Conf: ${s.confidence}`);
      if (s.price) lines.push(`   💰 $${s.price.toLocaleString()} (${s.change24h >= 0 ? '+' : ''}${(s.change24h || 0).toFixed(2)}%)`);
      lines.push(`   ▶️ ${s.action}`);
      lines.push('');
    });
  }
  
  // All signals detail
  lines.push(`\n📋 <b>ALL SIGNALS</b>`);
  sortedSignals.forEach(s => {
    lines.push(formatSignal(s));
  });
  
  // Footer
  lines.push('');
  lines.push('═══════════════════════════════');
  lines.push(`${EMOJI.shield} <i>Signals are algorithmic and not financial advice.</i>`);
  lines.push(`<i>Always DYOR before making investment decisions.</i>`);
  lines.push(`${EMOJI.bot} <i>Alpha Signals Bot v1.0</i>`);
  
  return lines.join('\n');
}

// Format compact alert for urgent signals
function formatUrgentAlert(signal) {
  const lines = [];
  
  lines.push(`${EMOJI.warning} <b>URGENT SIGNAL ALERT</b> ${EMOJI.warning}`);
  lines.push('');
  lines.push(`${signal.emoji} <b>${signal.symbol}</b> — ${signal.name}`);
  lines.push(`${EMOJI.signal} <b>${signal.signal}</b> (${signal.confidence} confidence)`);
  
  if (signal.price) {
    const changeEmoji = (signal.change24h || 0) >= 0 ? EMOJI.trend.up : EMOJI.trend.down;
    lines.push(`${EMOJI.price} $${signal.price.toLocaleString()} ${changeEmoji} ${(signal.change24h || 0).toFixed(2)}%`);
  }
  
  lines.push(`\n⚡ Action: <b>${signal.action}</b>`);
  lines.push(`🕐 Urgency: ${signal.urgency}`);
  
  if (signal.reasons?.length > 0) {
    lines.push(`\nKey Factors:`);
    signal.reasons.forEach(r => lines.push(`• ${r}`));
  }
  
  lines.push('');
  lines.push(`${EMOJI.shield} <i>This is an automated alert. Not financial advice.</i>`);
  
  return lines.join('\n');
}

// Format summary for heartbeat/cron
function formatSummary(signals) {
  const lines = [];
  const now = new Date();
  
  lines.push(`${EMOJI.bot} <b>Alpha Signals Summary</b>`);
  lines.push(`${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  lines.push('');
  
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  
  sorted.forEach(s => {
    const changeEmoji = (s.change24h || 0) >= 0 ? '📈' : '📉';
    lines.push(`${s.emoji} <b>${s.symbol}</b>: ${s.signal} (${s.confidence}) ${changeEmoji}`);
  });
  
  return lines.join('\n');
}

module.exports = {
  formatSignal,
  formatDailyReport,
  formatUrgentAlert,
  formatSummary,
  EMOJI
};
