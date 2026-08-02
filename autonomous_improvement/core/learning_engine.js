/**
 * Learning Engine
 * Analyzes past experiments to avoid repeating failures and improve hypotheses.
 */

const fs = require('fs');
const path = require('path');
const { log, loadJson, saveJson } = require('./utils');

const CONFIG = require('../config.json');

const LEARNING_FILE = path.join(CONFIG.workspace, CONFIG.data_dir, 'learning.json');

function loadLearning() {
  return loadJson(LEARNING_FILE) || {
    failures_by_anchor: {},      // anchorText -> count
    failures_by_title: {},       // hypothesis title -> count
    successes_by_title: {},      // hypothesis title -> count
    last_outcomes: {},           // target_file -> last outcome
    dedup_signatures: new Set().toString() // not used directly
  };
}

function saveLearning(data) {
  saveJson(LEARNING_FILE, data);
}

function recordOutcome(experiment) {
  const learning = loadLearning();
  const title = experiment.title || 'unknown';
  const outcome = experiment.outcome;

  if (outcome === 'success') {
    learning.successes_by_title[title] = (learning.successes_by_title[title] || 0) + 1;
    delete learning.failures_by_title[title]; // reset on success
  } else {
    learning.failures_by_title[title] = (learning.failures_by_title[title] || 0) + 1;
  }

  if (experiment.change && experiment.change.oldText) {
    const anchor = experiment.change.oldText.slice(0, 120);
    if (outcome !== 'success') {
      learning.failures_by_anchor[anchor] = (learning.failures_by_anchor[anchor] || 0) + 1;
    }
  }

  if (experiment.change && experiment.change.filePath) {
    learning.last_outcomes[experiment.change.filePath] = {
      outcome,
      timestamp: experiment.timestamp,
      title
    };
  }

  saveLearning(learning);
  log(`Learning recorded: ${title} -> ${outcome}`);
}

function getFailurePenalty(title, learning) {
  return learning.failures_by_title[title] || 0;
}

function isAnchorKnownBad(oldText, learning) {
  if (!oldText) return false;
  const anchor = oldText.slice(0, 120);
  return (learning.failures_by_anchor[anchor] || 0) >= 2;
}

function deduplicate(hypotheses) {
  const seen = new Set();
  return hypotheses.filter(h => {
    const sig = `${h.title}|${h.target_file}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

function rankWithLearning(hypotheses, learning) {
  const impactScore = { high: 3, medium: 2, low: 1 };
  return hypotheses
    .map(h => {
      const penalty = getFailurePenalty(h.title, learning) * 5;
      return {
        ...h,
        score: (impactScore[h.estimated_impact] * 10 - h.estimated_effort) - penalty,
        failure_count: learning.failures_by_title[h.title] || 0
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  recordOutcome,
  loadLearning,
  saveLearning,
  getFailurePenalty,
  isAnchorKnownBad,
  deduplicate,
  rankWithLearning
};
