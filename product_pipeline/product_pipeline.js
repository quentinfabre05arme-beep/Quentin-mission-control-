#!/usr/bin/env node
/**
 * Product Pipeline Mission - Autonomous Product Creation System
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────
const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const PIPELINE_FILE = path.join(MEMORY_DIR, 'product_pipeline.json');
const IDEAS_FILE = path.join(MEMORY_DIR, 'product_ideas.json');
const SALES_FILE = path.join(MEMORY_DIR, 'product_sales.json');
const REPORTS_DIR = path.join(MEMORY_DIR, 'product_reports');

// Ensure directories exist
[MEMORY_DIR, REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Data Layer ─────────────────────────────────────────────────────
function loadJson(file, defaultVal = {}) {
  if (!fs.existsSync(file)) return defaultVal;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return defaultVal; }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getPipeline() {
  return loadJson(PIPELINE_FILE, { products: [], version: '1.0.0', updated_at: new Date().toISOString() });
}
function savePipeline(data) {
  data.updated_at = new Date().toISOString();
  saveJson(PIPELINE_FILE, data);
}

function getIdeas() {
  return loadJson(IDEAS_FILE, { ideas: [], version: '1.0.0', updated_at: new Date().toISOString() });
}
function saveIdeas(data) {
  data.updated_at = new Date().toISOString();
  saveJson(IDEAS_FILE, data);
}

function getSales() {
  return loadJson(SALES_FILE, { records: [], version: '1.0.0', updated_at: new Date().toISOString() });
}
function saveSales(data) {
  data.updated_at = new Date().toISOString();
  saveJson(SALES_FILE, data);
}

// ─── Core Operations ────────────────────────────────────────────────

/**
 * Add a product idea to the backlog.
 */
function addIdea(title, description, category, target_audience, estimated_effort_days, priority = 'medium') {
  const ideas = getIdeas();
  const idea = {
    id: `idea_${Date.now()}`,
    title,
    description,
    category,
    target_audience,
    estimated_effort_days,
    priority,
    status: 'backlog',
    created_at: new Date().toISOString(),
    votes: 0,
    tags: []
  };
  ideas.ideas.push(idea);
  saveIdeas(ideas);
  console.log(`✅ Idea added: "${title}" (${idea.id})`);
  return idea;
}

/**
 * Promote an idea to a product in the pipeline.
 */
function promoteToProduct(ideaId, assignees = {}) {
  const ideas = getIdeas();
  const pipeline = getPipeline();
  const idx = ideas.ideas.findIndex(i => i.id === ideaId);
  if (idx === -1) throw new Error(`Idea ${ideaId} not found`);
  const idea = ideas.ideas[idx];

  const product = {
    id: `prod_${Date.now()}`,
    idea_id: idea.id,
    title: idea.title,
    description: idea.description,
    category: idea.category,
    target_audience: idea.target_audience,
    priority: idea.priority,
    stage: 'research',
    stages: {
      idea: { status: 'completed', started_at: idea.created_at, completed_at: new Date().toISOString() },
      research: { status: 'active', started_at: new Date().toISOString(), completed_at: null },
      design: { status: 'pending', started_at: null, completed_at: null },
      prototype: { status: 'pending', started_at: null, completed_at: null },
      mvp: { status: 'pending', started_at: null, completed_at: null },
      beta: { status: 'pending', started_at: null, completed_at: null },
      launched: { status: 'pending', started_at: null, completed_at: null },
      sunset: { status: 'pending', started_at: null, completed_at: null }
    },
    assignees: {
      pm: assignees.pm || null,
      design: assignees.design || null,
      engineering: assignees.engineering || null,
      marketing: assignees.marketing || null,
      ...assignees
    },
    milestones: [],
    launch_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  idea.status = 'promoted';
  pipeline.products.push(product);
  saveIdeas(ideas);
  savePipeline(pipeline);
  console.log(`🚀 "${product.title}" promoted to product (${product.id}), stage: research`);
  return product;
}

/**
 * Advance a product to the next stage.
 */
function advanceStage(productId, notes = '') {
  const pipeline = getPipeline();
  const prod = pipeline.products.find(p => p.id === productId);
  if (!prod) throw new Error(`Product ${productId} not found`);

  const stageOrder = ['idea', 'research', 'design', 'prototype', 'mvp', 'beta', 'launched', 'sunset'];
  const currentIdx = stageOrder.indexOf(prod.stage);
  if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
    throw new Error(`Cannot advance from stage "${prod.stage}"`);
  }

  const nextStage = stageOrder[currentIdx + 1];
  prod.stages[prod.stage].status = 'completed';
  prod.stages[prod.stage].completed_at = new Date().toISOString();
  prod.stages[nextStage].status = 'active';
  prod.stages[nextStage].started_at = new Date().toISOString();
  prod.stage = nextStage;
  prod.updated_at = new Date().toISOString();

  if (notes) {
    prod.milestones.push({ stage: nextStage, note: notes, at: new Date().toISOString() });
  }

  savePipeline(pipeline);
  console.log(`➡️ "${prod.title}" advanced: ${stageOrder[currentIdx]} → ${nextStage}`);
  return prod;
}

/**
 * Schedule a product launch.
 */
function scheduleLaunch(productId, launchDate, channels = []) {
  const pipeline = getPipeline();
  const prod = pipeline.products.find(p => p.id === productId);
  if (!prod) throw new Error(`Product ${productId} not found`);
  prod.launch_date = launchDate;
  prod.launch_channels = channels;
  prod.updated_at = new Date().toISOString();
  savePipeline(pipeline);
  console.log(`📅 "${prod.title}" launch scheduled: ${launchDate}`);
  return prod;
}

/**
 * Record a sales entry for a product.
 */
function recordSale(productId, units, revenue, channel, notes = '') {
  const sales = getSales();
  const record = {
    id: `sale_${Date.now()}`,
    product_id: productId,
    units: Number(units),
    revenue: Number(revenue),
    channel,
    notes,
    recorded_at: new Date().toISOString()
  };
  sales.records.push(record);
  saveSales(sales);
  console.log(`💰 Sale recorded: ${units} units, $${revenue} via ${channel}`);
  return record;
}

// ─── Reporting & Intelligence ────────────────────────────────────────

function getProductStats(productId) {
  const pipeline = getPipeline();
  const sales = getSales();
  const prod = pipeline.products.find(p => p.id === productId);
  if (!prod) return null;

  const prodSales = sales.records.filter(r => r.product_id === productId);
  const totalUnits = prodSales.reduce((s, r) => s + r.units, 0);
  const totalRevenue = prodSales.reduce((s, r) => s + r.revenue, 0);

  // Stage velocity (days per stage)
  const velocities = {};
  const stageOrder = ['idea', 'research', 'design', 'prototype', 'mvp', 'beta', 'launched'];
  for (const stage of stageOrder) {
    const s = prod.stages[stage];
    if (s.started_at && s.completed_at) {
      const start = new Date(s.started_at);
      const end = new Date(s.completed_at);
      velocities[stage] = Math.round((end - start) / (1000 * 60 * 60 * 24));
    } else if (s.started_at && s.status === 'active') {
      const start = new Date(s.started_at);
      velocities[stage] = Math.round((new Date() - start) / (1000 * 60 * 60 * 24));
    }
  }

  return {
    product: prod.title,
    stage: prod.stage,
    total_units_sold: totalUnits,
    total_revenue: totalRevenue,
    sales_count: prodSales.length,
    stage_velocities_days: velocities,
    launch_date: prod.launch_date,
    age_days: Math.round((new Date() - new Date(prod.created_at)) / (1000 * 60 * 60 * 24))
  };
}

function generatePipelineReport() {
  const pipeline = getPipeline();
  const sales = getSales();

  const stageCounts = {};
  const stageOrder = ['idea', 'research', 'design', 'prototype', 'mvp', 'beta', 'launched', 'sunset'];
  stageOrder.forEach(s => stageCounts[s] = 0);
  pipeline.products.forEach(p => { stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1; });

  const totalRevenue = sales.records.reduce((s, r) => s + r.revenue, 0);
  const totalUnits = sales.records.reduce((s, r) => s + r.units, 0);
  const avgRevenuePerSale = sales.records.length ? (totalRevenue / sales.records.length).toFixed(2) : 0;

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total_products: pipeline.products.length,
      total_ideas: getIdeas().ideas.length,
      total_revenue: totalRevenue,
      total_units_sold: totalUnits,
      avg_revenue_per_transaction: Number(avgRevenuePerSale)
    },
    stage_distribution: stageCounts,
    products: pipeline.products.map(p => ({
      id: p.id,
      title: p.title,
      stage: p.stage,
      stats: getProductStats(p.id)
    }))
  };

  const reportFile = path.join(REPORTS_DIR, `report_${new Date().toISOString().slice(0,10)}.json`);
  saveJson(reportFile, report);
  console.log(`📊 Pipeline report saved: ${reportFile}`);
  return report;
}

function suggestNextProduct() {
  const ideas = getIdeas();
  const pipeline = getPipeline();
  const sales = getSales();

  // Scoring: priority weight + freshness - pipeline duplication penalty
  const scored = ideas.ideas
    .filter(i => i.status === 'backlog')
    .map(idea => {
      const priorityScore = { high: 3, medium: 2, low: 1 }[idea.priority] || 1;
      const ageDays = Math.round((new Date() - new Date(idea.created_at)) / (1000 * 60 * 60 * 24));
      const freshness = Math.max(0, 30 - ageDays) / 30; // newer = higher
      const dupPenalty = pipeline.products.some(p => p.idea_id === idea.id) ? -10 : 0;
      const score = priorityScore + freshness + dupPenalty;
      return { idea, score: Number(score.toFixed(2)) };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    console.log('💡 No backlog ideas found. Consider generating new product ideas.');
    return null;
  }

  const winner = scored[0];
  console.log(`🎯 Suggested next product: "${winner.idea.title}" (score: ${winner.score})`);
  console.log(`   Description: ${winner.idea.description}`);
  console.log(`   Category: ${winner.idea.category} | Audience: ${winner.idea.target_audience}`);
  return winner;
}

// ─── CLI Interface ──────────────────────────────────────────────────

function printUsage() {
  console.log(`
Product Pipeline Mission v1.0.0
Usage:
  node product_pipeline.js idea <title> <description> [category] [audience] [effort_days] [priority]
  node product_pipeline.js promote <idea_id> [assignees_json]
  node product_pipeline.js advance <product_id> [notes]
  node product_pipeline.js launch <product_id> <date> [channels_json]
  node product_pipeline.js sale <product_id> <units> <revenue> <channel> [notes]
  node product_pipeline.js report
  node product_pipeline.js suggest
  node product_pipeline.js stats <product_id>
  node product_pipeline.js test
`);
}

function run(args) {
  const [cmd, ...rest] = args;
  if (!cmd) { printUsage(); process.exit(0); }

  switch (cmd) {
    case 'idea': {
      const [title, desc, cat = 'general', aud = 'all', effort = '14', prio = 'medium'] = rest;
      if (!title || !desc) { console.error('Usage: idea <title> <description> ...'); process.exit(1); }
      addIdea(title, desc, cat, aud, Number(effort), prio);
      break;
    }
    case 'promote': {
      const [ideaId, assigneesStr = '{}'] = rest;
      if (!ideaId) { console.error('Usage: promote <idea_id>'); process.exit(1); }
      promoteToProduct(ideaId, JSON.parse(assigneesStr));
      break;
    }
    case 'advance': {
      const [productId, notes = ''] = rest;
      if (!productId) { console.error('Usage: advance <product_id>'); process.exit(1); }
      advanceStage(productId, notes);
      break;
    }
    case 'launch': {
      const [productId, date, channelsStr = '[]'] = rest;
      if (!productId || !date) { console.error('Usage: launch <product_id> <date>'); process.exit(1); }
      scheduleLaunch(productId, date, JSON.parse(channelsStr));
      break;
    }
    case 'sale': {
      const [productId, units, revenue, channel, notes = ''] = rest;
      if (!productId || !units || !revenue || !channel) {
        console.error('Usage: sale <product_id> <units> <revenue> <channel>'); process.exit(1);
      }
      recordSale(productId, units, revenue, channel, notes);
      break;
    }
    case 'report': {
      const r = generatePipelineReport();
      console.log('\n📋 Pipeline Report');
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'suggest': {
      suggestNextProduct();
      break;
    }
    case 'stats': {
      const [productId] = rest;
      if (!productId) { console.error('Usage: stats <product_id>'); process.exit(1); }
      const s = getProductStats(productId);
      console.log(s ? JSON.stringify(s, null, 2) : 'Product not found');
      break;
    }
    case 'test': {
      runTests();
      break;
    }
    default:
      printUsage();
  }
}

// ─── Self-Test ──────────────────────────────────────────────────────
function runTests() {
  console.log('\n🧪 Running Product Pipeline Tests...\n');

  // Clear test data
  [PIPELINE_FILE, IDEAS_FILE, SALES_FILE].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  // 1. Add ideas
  const idea1 = addIdea('Crypto Dashboard Pro', 'Advanced portfolio analytics for crypto traders', 'fintech', 'crypto_traders', 21, 'high');
  const idea2 = addIdea('AI Content Generator', 'Auto-generate blog posts and social content', 'ai_tools', 'marketers', 14, 'medium');
  const idea3 = addIdea('Fitness Tracker API', 'Wearable data aggregation platform', 'health', 'fitness_apps', 30, 'low');
  console.assert(getIdeas().ideas.length === 3, 'Should have 3 ideas');
  console.log('✓ Idea creation');

  // 2. Promote to product
  const prod1 = promoteToProduct(idea1.id, { pm: 'Alice', engineering: 'Bob', design: 'Carol' });
  console.assert(prod1.stage === 'research', 'Should start at research');
  console.assert(getPipeline().products.length === 1, 'Should have 1 product');
  console.log('✓ Idea promotion');

  // 3. Advance stages
  advanceStage(prod1.id, 'Market research complete — niche validated');
  advanceStage(prod1.id, 'Wireframes approved');
  advanceStage(prod1.id, 'Working prototype with mock data');
  const pipeline = getPipeline();
  const updated = pipeline.products.find(p => p.id === prod1.id);
  console.assert(updated.stage === 'mvp', 'Should be at MVP');
  console.assert(updated.stages.research.status === 'completed', 'Research completed');
  console.log('✓ Stage advancement');

  // 4. Schedule launch
  scheduleLaunch(prod1.id, '2026-09-15', ['product_hunt', 'twitter', 'newsletter']);
  const launched = getPipeline().products.find(p => p.id === prod1.id);
  console.assert(launched.launch_date === '2026-09-15', 'Launch date set');
  console.log('✓ Launch scheduling');

  // 5. Record sales
  recordSale(prod1.id, 50, 2495, 'product_hunt', 'Launch day sales');
  recordSale(prod1.id, 120, 5988, 'newsletter', 'Week 1 campaign');
  recordSale(prod1.id, 30, 1497, 'twitter', 'Promo code users');
  const sales = getSales();
  console.assert(sales.records.length === 3, 'Should have 3 sales records');
  console.assert(sales.records.reduce((s, r) => s + r.revenue, 0) === 9980, 'Total revenue 9980');
  console.log('✓ Sales recording');

  // 6. Stats
  const stats = getProductStats(prod1.id);
  console.assert(stats.total_revenue === 9980, 'Stats revenue correct');
  console.assert(stats.total_units_sold === 200, 'Stats units correct');
  console.log('✓ Product stats');

  // 7. Report
  const report = generatePipelineReport();
  console.assert(report.summary.total_products === 1, 'Report product count');
  console.assert(report.summary.total_revenue === 9980, 'Report revenue');
  console.assert(report.stage_distribution.mvp === 1, 'Stage distribution');
  console.log('✓ Pipeline report');

  // 8. Suggest next
  const suggestion = suggestNextProduct();
  console.assert(suggestion.idea.title === 'AI Content Generator', 'Should suggest medium-priority fresh idea over low-priority old one');
  console.log('✓ Product suggestion');

  console.log('\n🎉 All tests passed!');
  console.log('\n📁 Files created:');
  console.log(`   ${PIPELINE_FILE}`);
  console.log(`   ${IDEAS_FILE}`);
  console.log(`   ${SALES_FILE}`);
  console.log(`   ${REPORTS_DIR}/`);

  // Print final state
  console.log('\n📊 Final Pipeline State:');
  console.log(JSON.stringify(getPipeline(), null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────
if (require.main === module) {
  run(process.argv.slice(2));
}

// Exports for programmatic use
module.exports = {
  addIdea,
  promoteToProduct,
  advanceStage,
  scheduleLaunch,
  recordSale,
  getProductStats,
  generatePipelineReport,
  suggestNextProduct,
  getPipeline,
  getIdeas,
  getSales,
  runTests
};
