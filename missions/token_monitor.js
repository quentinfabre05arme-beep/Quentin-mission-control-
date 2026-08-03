// ============================================================
// TOKEN & COST MONITOR v1.0
// Tracks daily/weekly token burn and estimated spend by model/task.
// Schedule: hourly via Task Scheduler (OpenClaw-Token-Monitor)
// ============================================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'project_claw_core', 'data', 'token_usage.json');
const LOG_FILE = path.join(__dirname, 'token_monitor.log');
const DAILY_BUDGET = 65000; // aligned with MEMORY.md Grok budget

// Approximate cost per 1K tokens (USD) — rough directional estimates
const COST_PER_1K = {
  'xai/grok-4.5': 0.012,
  'xai/grok-4': 0.008,
  'ollama-cloud/kimi-k2.6': 0.006,
  'ollama-cloud/kimi-k2.7-code': 0.006,
  'ollama-cloud/kimi-k2.5:cloud': 0.004,
  'ollama-cloud/qwen3-coder': 0.002,
  'ollama-cloud/qwen3': 0.002,
  'ollama-cloud/deepseek-v4-pro': 0.004,
  'default': 0.005
};

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, entry);
  console.log(msg);
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { return {}; }
  }
  return { days: {}, models: {}, tasks: {}, lastUpdated: null };
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function estimateCost(modelId, tokens) {
  const rate = COST_PER_1K[modelId] || COST_PER_1K.default;
  return (tokens / 1000) * rate;
}

class TokenMonitor {
  constructor() {
    this.data = loadData();
  }

  recordUsage(record) {
    const today = getToday();
    const { model = 'default', task = 'general', tokens = 0, source = 'unknown' } = record;

    // Daily bucket
    if (!this.data.days[today]) {
      this.data.days[today] = { tokens: 0, cost_usd: 0, records: [] };
    }
    this.data.days[today].tokens += tokens;
    this.data.days[today].cost_usd += estimateCost(model, tokens);
    this.data.days[today].records.push({ ...record, timestamp: new Date().toISOString() });
    // Keep last 100 records per day to avoid bloat
    this.data.days[today].records = this.data.days[today].records.slice(-100);

    // Model bucket
    if (!this.data.models[model]) {
      this.data.models[model] = { tokens: 0, cost_usd: 0, calls: 0 };
    }
    this.data.models[model].tokens += tokens;
    this.data.models[model].cost_usd += estimateCost(model, tokens);
    this.data.models[model].calls += 1;

    // Task bucket
    if (!this.data.tasks[task]) {
      this.data.tasks[task] = { tokens: 0, cost_usd: 0, calls: 0 };
    }
    this.data.tasks[task].tokens += tokens;
    this.data.tasks[task].cost_usd += estimateCost(model, tokens);
    this.data.tasks[task].calls += 1;

    saveData(this.data);
  }

  getSummary(days = 7) {
    const today = getToday();
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const daily = dates.map(date => ({
      date,
      tokens: this.data.days[date]?.tokens || 0,
      cost_usd: this.data.days[date]?.cost_usd || 0,
      records: this.data.days[date]?.records?.length || 0
    }));

    const todayUsage = daily[0];
    const alert = todayUsage.tokens > DAILY_BUDGET
      ? `⚠️ Daily budget exceeded: ${todayUsage.tokens.toLocaleString()} / ${DAILY_BUDGET.toLocaleString()} tokens`
      : null;

    return {
      generated_at: new Date().toISOString(),
      daily_budget: DAILY_BUDGET,
      today: todayUsage,
      daily,
      by_model: this.data.models,
      by_task: this.data.tasks,
      alert,
      total_cost_usd: Object.values(this.data.models).reduce((a, b) => a + (b.cost_usd || 0), 0)
    };
  }

  checkBudget() {
    const summary = this.getSummary(1);
    if (summary.alert) {
      log(`ALERT: ${summary.alert}`);
    }
    log(`Today: ${summary.today.tokens.toLocaleString()} tokens (~$${summary.today.cost_usd.toFixed(3)})`);
    return summary;
  }
}

function main() {
  const monitor = new TokenMonitor();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(monitor.getSummary(), null, 2));
  } else if (process.argv.includes('--record')) {
    // Expect: --record model task tokens source
    const idx = process.argv.indexOf('--record');
    const model = process.argv[idx + 1] || 'default';
    const task = process.argv[idx + 2] || 'general';
    const tokens = parseInt(process.argv[idx + 3] || '0', 10);
    const source = process.argv[idx + 4] || 'cli';
    monitor.recordUsage({ model, task, tokens, source });
    log(`Recorded ${tokens} tokens for ${model}/${task}`);
  } else {
    monitor.checkBudget();
  }
}

if (require.main === module) {
  main();
}

module.exports = TokenMonitor;
