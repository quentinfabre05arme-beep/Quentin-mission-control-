#!/usr/bin/env node
/**
 * 🔄 BUILD LOOP — Continuous capability expansion
 * Build → Assess → Build next
 */

const fs = require('fs');
const { execSync } = require('child_process');

// ─── ASSESS ───────────────────────────────────────────────
function assess() {
  const prefix = 'alpha_fund_v3/';
  const capabilities = [
    { name: 'System Control', files: ['core/autonomy_engine.js', 'core/execution_loop.js', 'core/master_controller.js'], weight: 15 },
    { name: 'Self-Healing', files: ['core/gateway_immortality.js', 'core/gateway_ultra.js'], weight: 10 },
    { name: 'GUI Control', files: ['core/gui_control.js', 'core/vision_engine.js'], weight: 10 },
    { name: 'Data/Storage', files: ['core/sqlite_brain.js', 'core/brain_engine.js', 'core/vector_brain.js'], weight: 10 },
    { name: 'Communication', files: ['core/email_agent.js', 'core/audio_engine.js', 'core/notify_engine.js'], weight: 10 },
    { name: 'Network', files: ['core/network_monitor.js', 'core/offline_mode.js'], weight: 5 },
    { name: 'File Mgmt', files: ['core/file_indexer.js', 'core/file_hygiene.js', 'core/self_audit.js'], weight: 10 },
    { name: 'AI/ML', files: ['core/decision_tracker.js', 'core/predictive_maintenance.js', 'core/self_goal_generator.js'], weight: 10 },
    { name: 'Research', files: ['core/package_installer.js'], weight: 5 },
    { name: 'Vision', files: ['core/vision_engine.js', 'core/screen_recorder.js'], weight: 15 }
  ];

  let totalScore = 0;
  let totalWeight = 0;

  capabilities.forEach(c => {
    const exists = c.files.filter(f => fs.existsSync(prefix + f)).length;
    const pct = Math.round((exists / c.files.length) * 100);
    const score = (pct / 100) * c.weight;
    totalScore += score;
    totalWeight += c.weight;
    console.log(c.name.padEnd(20) + ': ' + String(pct).padStart(3) + '%');
  });

  const overall = Math.round((totalScore / totalWeight) * 100);
  return overall;
}

// ─── GAPS TO FILL ─────────────────────────────────────────
function identifyGaps() {
  const gaps = [];
  
  // Check for missing tools
  const tools = ['ffmpeg', 'tesseract'];
  tools.forEach(t => {
    try {
      execSync(`where ${t}`, { timeout: 5000, windowsHide: true });
    } catch(e) {
      gaps.push(`Install ${t}`);
    }
  });
  
  // Check for missing integrations
  if (!fs.existsSync('alpha_fund_v3/core/usb_controller.js')) gaps.push('USB/webcam control');
  if (!fs.existsSync('alpha_fund_v3/core/advanced_mouse.js')) gaps.push('Advanced mouse automation');
  if (!fs.existsSync('alpha_fund_v3/core/clipboard_manager.js')) gaps.push('Clipboard history');
  if (!fs.existsSync('alpha_fund_v3/core/window_manager.js')) gaps.push('Window management');
  if (!fs.existsSync('alpha_fund_v3/core/process_automation.js')) gaps.push('Process automation');
  if (!fs.existsSync('alpha_fund_v3/core/registry_manager.js')) gaps.push('Registry manager');
  if (!fs.existsSync('alpha_fund_v3/core/scheduled_task_manager.js')) gaps.push('Task Scheduler API');
  if (!fs.existsSync('alpha_fund_v3/core/firewall_manager.js')) gaps.push('Firewall control');
  if (!fs.existsSync('alpha_fund_v3/core/printer_manager.js')) gaps.push('Printer control');
  if (!fs.existsSync('alpha_fund_v3/core/scanner_manager.js')) gaps.push('Scanner control');
  
  return gaps;
}

// ─── MAIN ─────────────────────────────────────────────────
function run() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║ 🔄 BUILD LOOP — ASSESSMENT              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  
  const score = assess();
  console.log('');
  console.log('OVERALL: ' + score + '%');
  
  const gaps = identifyGaps();
  if (gaps.length > 0) {
    console.log('');
    console.log('GAPS IDENTIFIED (' + gaps.length + '):');
    gaps.forEach((g, i) => console.log('  ' + (i+1) + '. ' + g));
    console.log('');
    console.log('Next build: ' + gaps[0]);
  } else {
    console.log('');
    console.log('✅ ALL CAPABILITIES BUILT');
    console.log('Score: 100% — SUPERHUMAN ACHIEVED');
  }
  
  return { score, gaps };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run, assess, identifyGaps };

if (require.main === module) {
  run();
}
