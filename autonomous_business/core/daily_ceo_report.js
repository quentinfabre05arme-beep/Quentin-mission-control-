/**
 * Autonomous Business Operation System — Daily CEO Report
 * Generates concise morning/evening briefs for Quentin.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = require('../config.json');
const BACKLOG_FILE = path.join(CONFIG.workspace, CONFIG.backlog_file);
const METRICS_FILE = path.join(CONFIG.workspace, CONFIG.metrics_file);

function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return null; }
}

function formatReport(kind = 'morning') {
  const backlog = loadJson(BACKLOG_FILE) || [];
  const metrics = loadJson(METRICS_FILE) || {};

  const top = backlog.sort((a, b) => b.score - a.score).slice(0, 3);
  const topLines = top.map((b, i) => `${i + 1}. **${b.name}** — score ${b.score}, status ${b.status}`).join('\n');

  const emoji = kind === 'morning' ? '\ud83c\udf05' : '\ud83c\udf06';
  return `${emoji} **ABOS ${kind.toUpperCase()} BRIEF**\n` +
    `\u23f0 ${new Date().toLocaleString('fr-FR')}\n\n` +
    `\ud83d\udcca **Metrics**\n` +
    `Cycles: ${metrics.cycles || 0} | Ideas: ${metrics.ideas || 0} | Validated: ${metrics.validated || 0} | Built: ${metrics.built || 0}\n\n` +
    `\ud83c\udfaf **Top Opportunities**\n${topLines}\n\n` +
    `\u2705 **Status**\n` +
    `Autonomous loop running. No action needed unless you want to redirect priorities.`;
}

module.exports = { formatReport };

if (require.main === module) {
  console.log(formatReport(process.argv[2] || 'morning'));
}
