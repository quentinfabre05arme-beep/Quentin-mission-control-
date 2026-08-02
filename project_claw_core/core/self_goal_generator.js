/**
 * PROJECT CLAW CORE — Self Goal Generator
 * Reads memory and current state to generate autonomous goals.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'self_goal_generator.log');
const GOALS_FILE = path.join(__dirname, '..', 'data', 'current_goals.json');
const MEMORY_FILE = path.join(__dirname, '..', 'memory', 'claw_memory.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e) { return null; }
}

function readMemoryHints() {
  const mem = loadJson(MEMORY_FILE);
  if (!mem || !mem.memories) return [];
  
  const hints = [];
  for (const [key, m] of Object.entries(mem.memories)) {
    if (m.importance >= 0.7) {
      const valueStr = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
      hints.push({ key, category: m.category, value: valueStr.slice(0, 200) });
    }
  }
  return hints;
}

function readRecentDailyMemory() {
  const today = new Date().toISOString().slice(0, 10);
  const file = path.join(__dirname, '..', '..', 'memory', `${today}.md`);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').slice(0, 1500);
}

function generateGoals() {
  log('Generating goals');
  const hints = readMemoryHints();
  const daily = readRecentDailyMemory();
  
  const goals = [];
  
  // Goal 1: If no Microsoft Graph API, suggest setting it up
  const msMemory = hints.find(h => h.key === 'microsoft_outlook' || h.key.includes('microsoft'));
  if (msMemory) {
    goals.push({
      id: 'ms_graph_upgrade',
      title: 'Upgrade Microsoft connection to Graph API',
      reason: 'Browser automation is fragile; Graph API is more reliable for Outlook/Calendar/OneDrive',
      priority: 'medium',
      action: 'Prompt user for Azure app credentials when ready'
    });
  }
  
  // Goal 2: If no backtesting engine, build it
  if (daily.includes('Backtesting engine not yet built')) {
    goals.push({
      id: 'build_backtester',
      title: 'Build Alpha Fund backtesting engine',
      reason: 'Needed to validate signals before live trading',
      priority: 'high',
      action: 'Create alpha_fund_v3/research/backtest_engine.js'
    });
  }
  
  // Goal 3: Capabilities functionalization
  const totalCaps = fs.readdirSync(path.join(__dirname, '..', 'agents')).filter(f => f.endsWith('.js')).length +
                    fs.readdirSync(path.join(__dirname, '..', 'core')).filter(f => f.endsWith('.js')).length;
  goals.push({
    id: 'functional_capabilities',
    title: 'Continue making top capabilities functional',
    reason: `${totalCaps} capability files exist; most are stubs that need real implementations`,
    priority: 'high',
    action: 'Implement real logic for GitHub, Slack, Discord, package installer, system monitor'
  });
  
  // Goal 4: Health monitoring
  goals.push({
    id: 'health_dashboard',
    title: 'Build real-time health dashboard',
    reason: 'Need visibility into RAM, disk, processes, cron jobs, API quotas',
    priority: 'medium',
    action: 'Create project_claw_core/core/health_dashboard.js'
  });
  
  const data = {
    generated_at: new Date().toISOString(),
    goals: goals.sort((a, b) => {
      const p = { high: 3, medium: 2, low: 1 };
      return p[b.priority] - p[a.priority];
    })
  };
  
  fs.mkdirSync(path.dirname(GOALS_FILE), { recursive: true });
  fs.writeFileSync(GOALS_FILE, JSON.stringify(data, null, 2));
  return data;
}

module.exports = { generateGoals, readMemoryHints };

if (require.main === module) {
  const goals = generateGoals();
  console.log(JSON.stringify(goals, null, 2));
}
