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
      title: 'Prune duplicate test plans in planner.js',
      category: 'workflow',
      reason: '10 active plans, 9 are "test" noise — clutters memory',
      target_file: 'project_claw_core/data/plans.json',
      estimated_effort: 5,
      estimated_impact: 'low'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Add timeout to research_router browser searches',
      category: 'performance',
      reason: 'ABOS research hangs when Puppeteer stalls',
      target_file: 'project_claw_core/agents/research_router.js',
      estimated_effort: 10,
      estimated_impact: 'high'
    },
    {
      id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'Rotate always_on_daemon.log when >100KB',
      category: 'performance',
      reason: 'Log grew to 350KB+ in one day',
      target_file: 'alpha_fund_v3/core/always_on_daemon.js',
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
