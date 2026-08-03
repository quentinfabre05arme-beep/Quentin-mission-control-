/**
 * Hypothesis Generator
 * Turns profile + knowledge into concrete, ranked, de-duplicated improvement hypotheses.
 */

const fs = require('fs');
const path = require('path');
const { log, loadJson, saveJson } = require('./utils');
const { deduplicate, rankWithLearning, loadLearning } = require('./learning_engine');

const CONFIG = require('../config.json');

function generateFromProfile(profile, learning) {
  const hypotheses = [];
  for (const cap of profile.top_weak || []) {
    if (!cap) continue;
    const title = `Improve reliability of ${cap.name}`;
    if ((learning.failures_by_title[title] || 0) >= 3) continue; // skip repeatedly-failing targets
    hypotheses.push({
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      category: 'reliability',
      reason: `${cap.attempts} attempts, ${cap.failures} failures, success rate ${cap.success_rate ? (cap.success_rate * 100).toFixed(0) : 'unknown'}%`,
      target_file: cap.path,
      estimated_effort: 15,
      estimated_impact: cap.issue_score > 20 ? 'high' : 'medium'
    });
  }
  return hypotheses;
}

function generateFromKnowledge(knowledge) {
  const hypotheses = [];
  const text = JSON.stringify(knowledge.findings).toLowerCase();

  if (text.includes('timeout') || text.includes('hang')) {
    hypotheses.push({
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add timeout guards to long-running capabilities',
      category: 'reliability',
      reason: 'Research suggests timeouts prevent stuck browser/API calls',
      target_file: 'project_claw_core/agents/research_router.js',
      estimated_effort: 10,
      estimated_impact: 'high'
    });
  }

  if (text.includes('memory') || text.includes('leak')) {
    hypotheses.push({
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Rotate oversized logs to prevent disk bloat',
      category: 'performance',
      reason: 'Large logs indicate potential memory/disk pressure',
      target_file: 'alpha_fund_v3/core/always_on_daemon.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    });
  }

  if (text.includes('test') || text.includes('verify')) {
    hypotheses.push({
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add functional smoke tests to capability modules',
      category: 'capability',
      reason: 'Research emphasizes automated testing for agent reliability',
      target_file: 'safe_capability_verifier.js',
      estimated_effort: 20,
      estimated_impact: 'high'
    });
  }

  return hypotheses;
}

function generateTemplateHypotheses() {
  // Rotating pool of safe, concrete hypotheses targeting active modules.
  const targets = [
    { file: 'project_claw_core/core/capability_router.js', name: 'capability router' },
    { file: 'project_claw_core/core/memory_tier.js', name: 'memory tier' },
    { file: 'project_claw_core/agents/research_router.js', name: 'research router' },
    { file: 'project_claw_core/core/capability_usage_tracker.js', name: 'capability usage tracker' },
    { file: 'project_claw_core/core/unified_master_orchestrator.js', name: 'unified master' },
    { file: 'alpha_fund_v3/core/always_on_daemon.js', name: 'always-on daemon' },
    { file: 'project_claw_core/core/hierarchical_planner.js', name: 'hierarchical planner' },
    { file: 'project_claw_core/core/agent_swarm.js', name: 'agent swarm' },
    { file: 'project_claw_core/core/status_reporter.js', name: 'status reporter' },
    { file: 'missions/smart_brain/orchestrator.js', name: 'smart brain orchestrator' }
  ];

  const templates = [
    { title: (n) => `Add input validation to ${n}`, category: 'reliability', reason: 'Prevent crashes from malformed inputs' },
    { title: (n) => `Add error logging to ${n}`, category: 'reliability', reason: 'Surface runtime errors for debugging' },
    { title: (n) => `Persist ${n} metrics`, category: 'workflow', reason: 'Track operational health over time' },
    { title: (n) => `Add retry wrapper to ${n}`, category: 'reliability', reason: 'Handle transient failures gracefully' },
    { title: (n) => `Add timeout guard to ${n}`, category: 'reliability', reason: 'Prevent hanging operations' }
  ];

  const hypotheses = [];
  const hour = new Date().getHours();
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const tmpl = templates[(hour + i) % templates.length];
    hypotheses.push({
      id: `hyp_dyn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: tmpl.title(t.name),
      category: tmpl.category,
      reason: tmpl.reason,
      target_file: t.file,
      estimated_effort: 10,
      estimated_impact: 'low',
      dynamic: true
    });
  }
  return hypotheses;
}

function generateStaticHypotheses() {
  return [
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add async timeout guard to capability functional tester',
      category: 'reliability',
      reason: 'Async capability tests can hang if child processes misbehave',
      target_file: 'project_claw_core/core/capability_functional_tester.js',
      estimated_effort: 15,
      estimated_impact: 'high'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Seed capability router index from usage tracker',
      category: 'performance',
      reason: 'Router index resets when empty; usage tracker already has live win-rate data',
      target_file: 'project_claw_core/core/capability_router.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Prune cold-tier memory archive older than 90 days',
      category: 'performance',
      reason: 'Cold memory archive grows indefinitely without pruning',
      target_file: 'project_claw_core/core/memory_tier.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Persist benchmark score history across runs',
      category: 'workflow',
      reason: 'Benchmark results overwrite the same file; trend tracking shows if system is improving',
      target_file: 'scripts/run_claw_benchmark.js',
      estimated_effort: 15,
      estimated_impact: 'high'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Normalize undefined goal titles in hierarchical planner',
      category: 'reliability',
      reason: 'Planner can create tasks with undefined titles when goals lack title field',
      target_file: 'project_claw_core/core/hierarchical_planner.js',
      estimated_effort: 10,
      estimated_impact: 'low'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add fallback route when capability router finds no match',
      category: 'reliability',
      reason: 'Router returns null capability for unknown tasks instead of a safe fallback',
      target_file: 'project_claw_core/core/capability_router.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add hot-tier size cap to memory tier',
      category: 'performance',
      reason: 'Hot memory tier can grow unbounded if setHot is called frequently',
      target_file: 'project_claw_core/core/memory_tier.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add retry helper for research sources',
      category: 'reliability',
      reason: 'Transient failures from Tavily/Brave should be retried before fallback',
      target_file: 'project_claw_core/agents/research_router.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Persist unified master cycle duration metrics',
      category: 'workflow',
      reason: 'Cycle duration is tracked but not persisted for trend analysis',
      target_file: 'project_claw_core/core/unified_master_orchestrator.js',
      estimated_effort: 10,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add max latency tracking to capability usage tracker',
      category: 'performance',
      reason: 'Average latency hides tail latency; max latency identifies slow capabilities',
      target_file: 'project_claw_core/core/capability_usage_tracker.js',
      estimated_effort: 10,
      estimated_impact: 'low'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add disk space guard to always-on daemon log rotation',
      category: 'reliability',
      reason: 'Log rotation can fail if disk is full; guard prevents writes when critical',
      target_file: 'alpha_fund_v3/core/always_on_daemon.js',
      estimated_effort: 10,
      estimated_impact: 'low'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add Tavily result cache TTL',
      category: 'workflow',
      reason: 'Reduce redundant API calls and cost',
      target_file: 'project_claw_core/agents/tavily_search.js',
      estimated_effort: 13,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add experiment impact scoring',
      category: 'workflow',
      reason: 'Prioritize high-value improvements',
      target_file: 'autonomous_improvement/core/experiment_runner.js',
      estimated_effort: 11,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add unified master stale subsystem heartbeat',
      category: 'reliability',
      reason: 'Detect hung subsystems',
      target_file: 'project_claw_core/core/unified_master_orchestrator.js',
      estimated_effort: 14,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add memory tier warm-to-cold promotion',
      category: 'workflow',
      reason: 'Keep hot tier fast',
      target_file: 'project_claw_core/core/memory_tier.js',
      estimated_effort: 15,
      estimated_impact: 'medium'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add safe JSON.parse wrapper to usage tracker',
      category: 'reliability',
      reason: 'JSON.parse can throw and crash the process',
      target_file: 'project_claw_core/core/capability_usage_tracker.js',
      estimated_effort: 10,
      estimated_impact: 'low'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add process error handler to unified master',
      category: 'reliability',
      reason: 'Unhandled rejections should be logged instead of crashing',
      target_file: 'project_claw_core/core/unified_master_orchestrator.js',
      estimated_effort: 10,
      estimated_impact: 'low'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add HTTP timeout to Tavily client',
      category: 'reliability',
      reason: 'Default timeout prevents hanging requests',
      target_file: 'project_claw_core/agents/tavily_search.js',
      estimated_effort: 10,
      estimated_impact: 'low'
    }
  ];
}

function generate() {
  log('Generating improvement hypotheses');
  const learning = loadLearning();
  const profile = loadJson(path.join(CONFIG.workspace, CONFIG.data_dir, 'capability_profile.json')) || { top_weak: [] };
  const knowledge = loadJson(path.join(CONFIG.workspace, CONFIG.data_dir, 'improvement_knowledge.json')) || { findings: [] };

  const all = deduplicate([
    ...generateFromProfile(profile, learning),
    ...generateFromKnowledge(knowledge),
    ...generateStaticHypotheses(),
    ...generateTemplateHypotheses()
  ]);

  const ranked = rankWithLearning(all, learning);
  const data = { generated_at: new Date().toISOString(), hypotheses: ranked };

  saveJson(path.join(CONFIG.workspace, CONFIG.data_dir, 'hypotheses.json'), data);
  log(`Generated ${ranked.length} hypotheses`);
  return ranked;
}

module.exports = { generate, generateFromProfile, generateFromKnowledge, generateStaticHypotheses, generateTemplateHypotheses, deduplicate };

if (require.main === module) {
  generate();
}
