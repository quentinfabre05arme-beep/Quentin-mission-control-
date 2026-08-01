const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const PORTFOLIO_PATH = path.join(__dirname, 'data', 'portfolio.json');
const LEDGER_PATH = path.join(__dirname, 'data', 'paper_ledger.json');
const PERFORMANCE_PATH = path.join(__dirname, 'data', 'performance.json');

function loadJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; } }

function formatCurrency(n) {
  if (typeof n !== 'number') return 'N/A';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildReport(result) {
  const portfolio = loadJson(PORTFOLIO_PATH, {});
  const ledger = loadJson(LEDGER_PATH, {});
  const perf = loadJson(PERFORMANCE_PATH, {});
  const today = new Date().toISOString().split('T')[0];
  const signals = result.signals || [];
  const topLongs = signals.filter(s => s.consensus === 'LONG').sort((a, b) => b.strength - a.strength).slice(0, 5);
  const topAvoids = signals.filter(s => s.consensus === 'AVOID').sort((a, b) => b.strength - a.strength).slice(0, 5);
  const lines = [];
  lines.push(`Claw Alpha Fund — Daily Paper Trading Report — ${today}`);
  lines.push('');
  lines.push(`NAV: ${formatCurrency(perf.summary?.currentNav || portfolio.cash)} | Cash: ${formatCurrency(portfolio.cash || 0)}`);
  lines.push(`Total Return: ${(perf.summary?.totalReturnPct || 0).toFixed(2)}% | Max Drawdown: ${(perf.summary?.maxDrawdownPct || 0).toFixed(2)}%`);
  lines.push(`Open Positions: ${portfolio.positions?.length || 0} | Total Trades: ${ledger.stats?.totalTrades || 0}`);
  lines.push('');
  lines.push('Top Signals (LONG):');
  for (const s of topLongs) {
    lines.push(`  ${s.asset.symbol} @ $${s.asset.price} — strength ${s.strength.toFixed(2)}`);
  }
  if (topLongs.length === 0) lines.push('  None');
  lines.push('');
  lines.push('Top Signals (AVOID):');
  for (const s of topAvoids) {
    lines.push(`  ${s.asset.symbol} @ $${s.asset.price} — strength ${s.strength.toFixed(2)}`);
  }
  if (topAvoids.length === 0) lines.push('  None');
  lines.push('');
  lines.push('Open Positions:');
  if ((portfolio.positions || []).length === 0) {
    lines.push('  No open positions.');
  } else {
    for (const p of portfolio.positions) {
      const u = p.marketValue - (p.costBasis * p.qty);
      lines.push(`  ${p.symbol}: ${p.qty} @ cost $${p.costBasis.toFixed(2)} | mtm $${formatCurrency(p.marketValue)} | unrealized ${formatCurrency(u)}`);
    }
  }
  lines.push('');
  lines.push('Recent Trades:');
  const recent = (ledger.trades || []).slice(-5).reverse();
  if (recent.length === 0) lines.push('  No trades yet.');
  for (const t of recent) {
    lines.push(`  ${t.date.split('T')[0]} ${t.action} ${t.qty} ${t.symbol} @ $${t.price.toFixed(2)} — ${t.reason}`);
  }
  lines.push('');
  lines.push('Disclaimer: Paper trading only. Not investment advice.');
  return lines.join('\n');
}

async function saveReport(text) {
  const p = path.join(__dirname, 'reports', `daily_report_${new Date().toISOString().split('T')[0]}.txt`);
  fs.writeFileSync(p, text);
  return p;
}

async function sendEmail(subject, body) {
  const credentialsPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.openclaw', 'google_credentials.json');
  const tokenPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.openclaw', 'google_token.json');
  if (!fs.existsSync(credentialsPath) || !fs.existsSync(tokenPath)) {
    console.log('Gmail OAuth credentials/token not found. Report saved locally. Paths:', credentialsPath, tokenPath);
    return false;
  }
  const auth = new google.auth.OAuth2();
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  auth.setCredentials(token);
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = Buffer.from(
    `To: ${CONFIG.reportRecipients.join(', ')}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return true;
}

async function generateAndSend(result) {
  const report = buildReport(result);
  await saveReport(report);
  console.log('\n--- DAILY REPORT ---\n');
  console.log(report);
  console.log('\n--- END REPORT ---\n');
  try {
    const sent = await sendEmail(`Claw Alpha Fund Daily Report — ${new Date().toISOString().split('T')[0]}`, report);
    if (sent) console.log('Report emailed successfully.');
    else console.log('Report saved locally; email not sent (missing OAuth credentials).');
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
  return report;
}

module.exports = { buildReport, generateAndSend, saveReport, sendEmail };
