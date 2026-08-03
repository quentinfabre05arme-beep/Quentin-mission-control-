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
    ...generateStaticHypotheses()
  ]);

  const ranked = rankWithLearning(all, learning);
  const data = { generated_at: new Date().toISOString(), hypotheses: ranked };

  saveJson(path.join(CONFIG.workspace, CONFIG.data_dir, 'hypotheses.json'), data);
  log(`Generated ${ranked.length} hypotheses`);
  return ranked;
}

module.exports = { generate, generateFromProfile, generateFromKnowledge, generateStaticHypotheses, deduplicate };

if (require.main === module) {
  generate();
}
