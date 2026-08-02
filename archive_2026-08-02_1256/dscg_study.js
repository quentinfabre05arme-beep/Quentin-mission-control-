#!/usr/bin/env node
/**
 * DSCG Study Mission Engine
 * Suivi complet de la préparation au DSCG pour Quentin
 * Langue: Français
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = path.resolve(__dirname, '..');
const DSCG_DIR = path.join(WORKSPACE, 'dscg_study');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const STATE_FILE = path.join(DSCG_DIR, 'team_state.json');
const PROGRESS_FILE = path.join(MEMORY_DIR, 'dscg_progress.json');

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function now() {
  return new Date().toISOString();
}

function daysUntil(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function readJSON(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function ensureDirs() {
  [DSCG_DIR, MEMORY_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadState() {
  let state = readJSON(STATE_FILE);
  if (!state) {
    state = initState();
  }
  return state;
}

function initState() {
  const state = {
    mission: 'dscg_study',
    created: today(),
    status: 'active',
    language: 'fr',
    exam_date: '2027-05-15',
    exam_session: 'session_principale_2027',
    domains: {},
    total_hours: 0,
    sessions_count: 0,
    current_streak: 0,
    best_streak: 0,
    last_session_date: null,
    study_goal_hours_per_week: 12,
    study_goal_days_per_week: 4,
    start_date: today(),
    target_completion_date: '2027-03-31',
    revision_phase_start: '2027-04-01'
  };

  const domainDefs = [
    { code: 'D01', name: 'Droit des sociétés', priority: 3 },
    { code: 'D02', name: 'Droit des affaires', priority: 3 },
    { code: 'D03', name: 'Finance', priority: 2 },
    { code: 'D04', name: 'Contrôle de gestion', priority: 2 },
    { code: 'D05', name: 'Management et SI', priority: 3 },
    { code: 'D06', name: 'Droit fiscal', priority: 1 },
    { code: 'D07', name: 'Comptabilité approfondie', priority: 1 },
    { code: 'D08', name: 'Comptabilité et audit', priority: 1 }
  ];

  for (const d of domainDefs) {
    state.domains[d.code] = {
      name: d.name,
      weight: 1,
      status: 'not_started',
      progress_pct: 0,
      hours_studied: 0,
      last_studied: null,
      revision_count: 0,
      priority: d.priority,
      next_review: null
    };
  }

  writeJSON(STATE_FILE, state);
  return state;
}

// ─── CORE FUNCTIONS ──────────────────────────────────────────────────────────

function recordSession(domainCode, durationMinutes, notes = '', topics = []) {
  ensureDirs();
  const state = loadState();
  const date = today();
  const sessionId = `sess_${date}_${Date.now()}`;

  if (!state.domains[domainCode]) {
    return { error: `Domaine ${domainCode} inconnu` };
  }

  const session = {
    id: sessionId,
    date,
    domain: domainCode,
    domain_name: state.domains[domainCode].name,
    duration_minutes: durationMinutes,
    notes,
    topics: topics || [],
    timestamp: now()
  };

  // Update state
  const dom = state.domains[domainCode];
  dom.hours_studied += durationMinutes / 60;
  dom.last_studied = date;
  dom.revision_count += 1;

  // Progress calculation: base on hours, capped at 100%
  // Assumption: ~50h per domain for full mastery
  const targetHours = 50;
  dom.progress_pct = Math.min(100, Math.round((dom.hours_studied / targetHours) * 100));

  if (dom.progress_pct > 0 && dom.progress_pct < 30) dom.status = 'started';
  else if (dom.progress_pct >= 30 && dom.progress_pct < 70) dom.status = 'in_progress';
  else if (dom.progress_pct >= 70 && dom.progress_pct < 100) dom.status = 'advanced';
  else if (dom.progress_pct >= 100) dom.status = 'mastered';

  // Next review: spaced repetition (1 day, 3 days, 7 days, 14 days, 30 days)
  const intervals = [1, 3, 7, 14, 30];
  const idx = Math.min(dom.revision_count - 1, intervals.length - 1);
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervals[idx]);
  dom.next_review = nextDate.toISOString().slice(0, 10);

  // Global stats
  state.total_hours += durationMinutes / 60;
  state.sessions_count += 1;

  // Streak
  if (state.last_session_date) {
    const last = new Date(state.last_session_date);
    const todayDate = new Date(date);
    const diffDays = Math.round((todayDate - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      state.current_streak += 1;
    } else if (diffDays > 1) {
      state.current_streak = 1;
    }
  } else {
    state.current_streak = 1;
  }
  state.best_streak = Math.max(state.best_streak, state.current_streak);
  state.last_session_date = date;

  writeJSON(STATE_FILE, state);

  // Save session to daily memory
  const dayFile = path.join(MEMORY_DIR, `dscg_${date}.json`);
  let dayData = readJSON(dayFile) || { date, sessions: [] };
  dayData.sessions.push(session);
  writeJSON(dayFile, dayData);

  // Update cumulative progress
  let progress = readJSON(PROGRESS_FILE) || { sessions: [] };
  progress.sessions.push(session);
  writeJSON(PROGRESS_FILE, progress);

  return { success: true, session, state: getSummary(state) };
}

function suggestNextTopic(state) {
  const domains = Object.entries(state.domains);

  // Priority: low progress + high priority + overdue review
  const scored = domains.map(([code, d]) => {
    let score = 0;
    // Lower progress = higher urgency
    score += (100 - d.progress_pct) * 2;
    // Priority: 1=high, 3=low → invert
    score += (4 - d.priority) * 15;
    // Overdue review bonus
    if (d.next_review && d.next_review <= today()) {
      score += 20;
    }
    // Not studied recently penalty
    if (!d.last_studied) {
      score += 10;
    }
    return { code, ...d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];

  return {
    suggested_domain: top.code,
    domain_name: top.name,
    reason: top.progress_pct < 30
      ? `Prioritaire — ${top.name} n'est que à ${top.progress_pct}%`
      : top.next_review && top.next_review <= today()
        ? `Révision due — dernière session le ${top.last_studied}`
        : `Rotation suggérée — ${top.name} mérite attention`,
    alternatives: scored.slice(1, 3).map(s => ({ code: s.code, name: s.name, score: Math.round(s.score) }))
  };
}

function getSummary(state) {
  const domains = Object.entries(state.domains).map(([code, d]) => ({
    code,
    name: d.name,
    status: d.status,
    progress_pct: d.progress_pct,
    hours_studied: Math.round(d.hours_studied * 10) / 10,
    last_studied: d.last_studied,
    revision_count: d.revision_count,
    priority: d.priority,
    next_review: d.next_review
  }));

  const masteredCount = domains.filter(d => d.status === 'mastered').length;
  const inProgressCount = domains.filter(d => ['started', 'in_progress', 'advanced'].includes(d.status)).length;
  const notStartedCount = domains.filter(d => d.status === 'not_started').length;

  const daysLeft = daysUntil(state.exam_date);
  const weeksLeft = Math.round(daysLeft / 7);

  return {
    exam_countdown: {
      days_left: daysLeft,
      weeks_left: weeksLeft,
      exam_date: state.exam_date,
      urgency: daysLeft < 30 ? 'CRITIQUE' : daysLeft < 90 ? 'ÉLEVÉE' : daysLeft < 180 ? 'MODÉRÉE' : 'CONFORTABLE'
    },
    overall_progress: {
      mastered: masteredCount,
      in_progress: inProgressCount,
      not_started: notStartedCount,
      total_hours: Math.round(state.total_hours * 10) / 10,
      sessions_count: state.sessions_count,
      current_streak: state.current_streak,
      best_streak: state.best_streak,
      avg_hours_per_session: state.sessions_count > 0
        ? Math.round((state.total_hours / state.sessions_count) * 10) / 10
        : 0
    },
    domains,
    suggestion: suggestNextTopic(state),
    weekly_goal: {
      target_hours: state.study_goal_hours_per_week,
      target_days: state.study_goal_days_per_week
    }
  };
}

function generateReport(state) {
  const s = getSummary(state);
  const lines = [];

  lines.push('═══════════════════════════════════════════');
  lines.push('    📊 RAPPORT DE PROGRESSION DSCG');
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  // Countdown
  const cd = s.exam_countdown;
  lines.push(`⏰ COMPTE À REBOURS`);
  lines.push(`   Examen: ${cd.exam_date} — ${cd.days_left} jours restants (${cd.weeks_left} semaines)`);
  lines.push(`   Urgence: ${cd.urgency}`);
  lines.push('');

  // Overall
  const o = s.overall_progress;
  lines.push(`📈 STATISTIQUES GLOBALES`);
  lines.push(`   Domaines maîtrisés: ${o.mastered}/8`);
  lines.push(`   En cours: ${o.in_progress}/8`);
  lines.push(`   Non commencés: ${o.not_started}/8`);
  lines.push(`   Heures totales: ${o.total_hours}h sur ${o.sessions_count} sessions`);
  lines.push(`   Séquence actuelle: ${o.current_streak} jour(s) (record: ${o.best_streak})`);
  lines.push(`   Durée moyenne/session: ${o.avg_hours_per_session}h`);
  lines.push('');

  // Domains
  lines.push(`📚 AVANCEMENT PAR DOMAINE`);
  for (const d of s.domains) {
    const barLen = 20;
    const filled = Math.round((d.progress_pct / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    const statusEmoji = d.status === 'mastered' ? '✅' : d.status === 'advanced' ? '🟢' : d.status === 'in_progress' ? '🟡' : d.status === 'started' ? '🟠' : '🔴';
    lines.push(`   ${statusEmoji} ${d.code} — ${d.name}`);
    lines.push(`      [${bar}] ${d.progress_pct}% | ${d.hours_studied}h | ${d.revision_count} révisions`);
    if (d.last_studied) {
      lines.push(`      Dernière session: ${d.last_studied} | Prochaine révision: ${d.next_review || '—'}`);
    }
  }
  lines.push('');

  // Suggestion
  const sug = s.suggestion;
  lines.push(`💡 SUGGESTION DU JOUR`);
  lines.push(`   → Étudier: ${sug.domain_name} (${sug.suggested_domain})`);
  lines.push(`   Raison: ${sug.reason}`);
  if (sug.alternatives.length > 0) {
    lines.push(`   Alternatives: ${sug.alternatives.map(a => a.name).join(', ')}`);
  }
  lines.push('');
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

// ─── CLI COMMANDS ────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
Usage: node dscg_study.js <command> [options]

Commands:
  init                          Initialiser l'état de la mission
  session <domain> <minutes> [notes] [topics]   Enregistrer une session
  report                        Générer le rapport complet
  suggest                       Suggérer le prochain domaine
  summary                       Résumé rapide
  countdown                     Compte à rebours examen
  list                          Lister toutes les sessions

Domains: D01, D02, D03, D04, D05, D06, D07, D08

Examples:
  node dscg_study.js session D06 60 "Révision TVA" "TVA,déductibilité"
  node dscg_study.js report
  node dscg_study.js suggest
`);
}

function main() {
  ensureDirs();
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    showHelp();
    return;
  }

  if (cmd === 'init') {
    const state = initState();
    console.log('✅ Mission DSCG initialisée');
    console.log(`   Examen: ${state.exam_date}`);
    console.log(`   8 domaines prêts`);
    return;
  }

  let state = loadState();
  if (!state) {
    console.log('⚠️  État non trouvé. Exécutez: node dscg_study.js init');
    return;
  }

  if (cmd === 'session') {
    const domain = args[1];
    const minutes = parseInt(args[2], 10);
    const notes = args[3] || '';
    const topics = args[4] ? args[4].split(',') : [];

    if (!domain || !minutes) {
      console.log('Usage: node dscg_study.js session <domain> <minutes> [notes] [topics]');
      return;
    }

    const result = recordSession(domain, minutes, notes, topics);
    if (result.error) {
      console.log(`❌ Erreur: ${result.error}`);
      return;
    }

    console.log('✅ Session enregistrée');
    console.log(`   Domaine: ${result.session.domain_name} (${result.session.domain})`);
    console.log(`   Durée: ${result.session.duration_minutes} minutes`);
    console.log(`   Date: ${result.session.date}`);
    console.log(`   Progression: ${result.state.domains.find(d => d.code === domain).progress_pct}%`);
    return;
  }

  if (cmd === 'report') {
    console.log(generateReport(state));
    return;
  }

  if (cmd === 'suggest') {
    const sug = suggestNextTopic(state);
    console.log('💡 SUGGESTION');
    console.log(`   → ${sug.domain_name} (${sug.suggested_domain})`);
    console.log(`   Raison: ${sug.reason}`);
    if (sug.alternatives.length > 0) {
      console.log(`   Alternatives:`);
      for (const a of sug.alternatives) {
        console.log(`      • ${a.name} (score: ${a.score})`);
      }
    }
    return;
  }

  if (cmd === 'summary') {
    const s = getSummary(state);
    console.log('📊 RÉSUMÉ DSCG');
    console.log(`   Examen dans: ${s.exam_countdown.days_left} jours`);
    console.log(`   Progression: ${s.overall_progress.mastered}/8 maîtrisés, ${s.overall_progress.in_progress}/8 en cours`);
    console.log(`   Heures: ${s.overall_progress.total_hours}h | Sessions: ${s.overall_progress.sessions_count}`);
    console.log(`   Séquence: ${s.overall_progress.current_streak} jours`);
    console.log(`   → Prochaine cible: ${s.suggestion.domain_name}`);
    return;
  }

  if (cmd === 'countdown') {
    const cd = getSummary(state).exam_countdown;
    console.log('⏰ COMPTE À REBOURS');
    console.log(`   Examen DSCG: ${cd.exam_date}`);
    console.log(`   ${cd.days_left} jours restants`);
    console.log(`   ${cd.weeks_left} semaines restantes`);
    console.log(`   Niveau d'urgence: ${cd.urgency}`);
    return;
  }

  if (cmd === 'list') {
    const progress = readJSON(PROGRESS_FILE) || { sessions: [] };
    console.log('📋 TOUTES LES SESSIONS');
    console.log(`   Total: ${progress.sessions.length} sessions`);
    for (const sess of progress.sessions.slice(-20)) {
      console.log(`   [${sess.date}] ${sess.domain} — ${sess.duration_minutes}min — ${sess.notes || '—'}`);
    }
    return;
  }

  console.log(`Commande inconnue: ${cmd}`);
  showHelp();
}

// Export for testing / programmatic use
module.exports = {
  initState,
  loadState,
  recordSession,
  suggestNextTopic,
  getSummary,
  generateReport,
  today,
  daysUntil
};

// CLI entry
if (require.main === module) {
  main();
}
