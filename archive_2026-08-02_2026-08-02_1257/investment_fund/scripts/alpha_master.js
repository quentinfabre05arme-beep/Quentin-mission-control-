/**
 * ALPHA MASTER ORCHESTRATOR
 * 100% autonomous investing system
 * Coordinates scanners, sizers, improvements — zero human intervention
 */

const { runScan } = require('./asymmetry_scanner');
const { runWatcher } = require('./catalyst_watcher');
const { displaySizing } = require('./position_sizer');
const { runImprovement } = require('./self_improvement');

const MODE = process.argv[2] || 'discovery'; // discovery, catalyst, sizing, improve, full

async function runDiscoveryMode() {
  console.log('🎯 DISCOVERY MODE\n');
  const opportunities = await runScan();
  
  // Auto-queue high-conviction
  const highConviction = opportunities.filter(o => o.asymmetryScore >= 5.0);
  if (highConviction.length > 0) {
    console.log(`\n🚨 AUTO-QUEUED ${highConviction.length} OPPORTUNITIES:`);
    highConviction.slice(0, 5).forEach(o => {
      console.log(`   ${o.ticker}: ${o.asymmetryScore.toFixed(1)}x — ${o.catalyst}`);
    });
  }
  
  return highConviction;
}

function runCatalystMode() {
  console.log('📅 CATALYST MODE\n');
  runWatcher();
}

function runSizingMode() {
  console.log('📊 SIZING MODE\n');
  // Load latest opportunities
  const fs = require('fs');
  const path = require('path');
  const oppDir = path.join(__dirname, '..', 'opportunities');
  
  const files = fs.readdirSync(oppDir)
    .filter(f => f.startsWith('scan_'))
    .sort()
    .slice(-1);
  
  if (files.length === 0) {
    console.log('No opportunities found. Run discovery mode first.');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(path.join(oppDir, files[0]), 'utf8'));
  displaySizing(data.opportunities);
}

function runImprovementMode() {
  console.log('🔄 IMPROVEMENT MODE\n');
  runImprovement();
}

async function runFullCycle() {
  console.log('🚀 FULL AUTONOMOUS CYCLE\n' + '='.repeat(60) + '\n');
  
  // 1. Discovery
  const opportunities = await runDiscoveryMode();
  console.log('\n' + '-'.repeat(60));
  
  // 2. Catalyst check
  runCatalystMode();
  console.log('\n' + '-'.repeat(60));
  
  // 3. Position sizing
  runSizingMode();
  console.log('\n' + '-'.repeat(60));
  
  // 4. Self-improvement (daily only, check if needed)
  const hour = new Date().getHours();
  if (hour === 6) { // 6 AM
    runImprovementMode();
  } else {
    console.log('⏭️  Self-improvement skipped (runs at 6 AM)');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ FULL CYCLE COMPLETE');
  console.log(`⏰ Next scan: ${new Date(Date.now() + 15*60*1000).toLocaleTimeString()}`);
}

// Run based on mode
switch (MODE) {
  case 'discovery':
    runDiscoveryMode().catch(console.error);
    break;
  case 'catalyst':
    runCatalystMode();
    break;
  case 'sizing':
    runSizingMode();
    break;
  case 'improve':
    runImprovementMode();
    break;
  case 'full':
    runFullCycle().catch(console.error);
    break;
  default:
    console.log(`Unknown mode: ${MODE}`);
    console.log('Usage: node alpha_master.js [discovery|catalyst|sizing|improve|full]');
}

module.exports = { runFullCycle, runDiscoveryMode };
