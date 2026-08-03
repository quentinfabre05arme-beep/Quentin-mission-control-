/**
 * Hypothesis Generator
 * Turns profile + external knowledge + templates into concrete, ranked, de-duplicated improvement hypotheses.
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
  const findings = knowledge && knowledge.findings ? knowledge.findings : [];
  const text = JSON.stringify(findings).toLowerCase();

  // Builder-backed mapping: each keyword maps to a safe, existing builder pattern.
  const ideaBank = [
    {
      keywords: ['timeout', 'hang', 'stuck', 'slow call'],
      title: 'Add timeout guard to research router',
      category: 'reliability',
      target_file: 'project_claw_core/agents/research_router.js',
      reason: 'Research suggests timeouts prevent stuck browser/API calls'
    },
    {
      keywords: ['timeout', 'hang', 'test stall'],
      title: 'Add async timeout guard to capability functional tester',
      category: 'reliability',
      target_file: 'project_claw_core/core/capability_functional_tester.js',
      reason: 'Research suggests async tests need guardrails'
    },
    {
      keywords: ['memory', 'leak', 'disk', 'bloat', 'log'],
      title: 'Add disk space guard to always-on daemon log rotation',
      category: 'reliability',
      target_file: 'alpha_fund_v3/core/always_on_daemon.js',
      reason: 'Research links log bloat to disk/memory pressure'
    },
    {
      keywords: ['memory', 'leak', 'cache', 'unbounded'],
      title: 'Add hot-tier size cap to memory tier',
      category: 'performance',
      target_file: 'project_claw_core/core/memory_tier.js',
      reason: 'Research warns against unbounded hot caches'
    },
    {
      keywords: ['memory', 'archive', 'cleanup', 'prune'],
      title: 'Prune cold-tier memory archive older than 90 days',
      category: 'performance',
      target_file: 'project_claw_core/core/memory_tier.js',
      reason: 'Research recommends periodic cold-data cleanup'
    },
    {
      keywords: ['retry', 'transient', 'flaky', 'network error'],
      title: 'Add retry helper for research sources',
      category: 'reliability',
      target_file: 'project_claw_core/agents/research_router.js',
      reason: 'Research recommends retrying transient failures before fallback'
    },
    {
      keywords: ['fallback', 'degradation', 'graceful'],
      title: 'Add fallback route when capability router finds no match',
      category: 'reliability',
      target_file: 'project_claw_core/core/capability_router.js',
      reason: 'Research suggests graceful fallbacks for unknown tasks'
    },
    {
      keywords: ['metrics', 'observability', 'monitoring', 'latency'],
      title: 'Add max latency tracking to capability usage tracker',
      category: 'performance',
      target_file: 'project_claw_core/core/capability_usage_tracker.js',
      reason: 'Research says tail latency matters more than averages'
    },
    {
      keywords: ['metrics', 'history', 'trend', 'benchmark'],
      title: 'Persist benchmark score history across runs',
      category: 'workflow',
      target_file: 'scripts/run_claw_benchmark.js',
      reason: 'Research emphasizes tracking improvement trends'
    },
    {
      keywords: ['input', 'validation', 'sanitize', 'malformed'],
      title: 'Add input validation to unified master orchestrator',
      category: 'reliability',
      target_file: 'project_claw_core/core/unified_master_orchestrator.js',
      reason: 'Research recommends validating inputs at orchestrator boundaries'
    },
    {
      keywords: ['error', 'logging', 'debug', 'visibility'],
      title: 'Add error logging to unified master orchestrator',
      category: 'reliability',
      target_file: 'project_claw_core/core/unified_master_orchestrator.js',
      reason: 'Research recommends better error visibility in orchestrators'
    },
    {
      keywords: ['test', 'verify', 'smoke test', 'functional test'],
      title: 'Add functional smoke tests to capability modules',
      category: 'capability',
      target_file: 'safe_capability_verifier.js',
      reason: 'Research emphasizes automated testing for agent reliability'
    },
    {
      keywords: ['plan', 'goal', 'hierarchy', 'scheduler'],
      title: 'Normalize undefined goal titles in hierarchical planner',
      category: 'reliability',
      target_file: 'project_claw_core/core/hierarchical_planner.js',
      reason: 'Research recommends defensive task title handling'
    },
    {
      keywords: ['seed', 'index', 'router', 'rank'],
      title: 'Seed capability router index from usage tracker',
      category: 'performance',
      target_file: 'project_claw_core/core/capability_router.js',
      reason: 'Research suggests using live performance data for routing'
    }
  ];

  const seenTitles = new Set();
  for (const idea of ideaBank) {
    const matched = idea.keywords.some(k => text.includes(k));
    if (!matched) continue;
    if (seenTitles.has(idea.title)) continue;
    seenTitles.add(idea.title);
    hypotheses.push({
      id: `hyp_know_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: idea.title,
      category: idea.category,
      reason: idea.reason,
      target_file: idea.target_file,
      estimated_effort: 10,
      estimated_impact: 'medium',
      source: 'knowledge'
    });
  }

  return hypotheses;
}

function generateTemplateHypotheses() {
  // Rotating pool of safe, concrete hypotheses targeting active modules.
  // Only templates that have safe, generic builders enabled.
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
    { title: (n) => `Persist ${n} metrics`, category: 'workflow', reason: 'Track operational health over time' }
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
