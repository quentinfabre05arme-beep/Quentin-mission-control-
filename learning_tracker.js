#!/usr/bin/env node
/**
 * Learning Tracker Mission v1.0
 * Tracks subjects, logs study sessions, measures progress, suggests next topics.
 */

const fs = require('fs');
const path = require('path');

// --- Config ---
const DATA_DIR = path.join(__dirname, 'memory', 'learning');
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// --- Helpers ---
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function loadJSON(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function nowISO() { return new Date().toISOString(); }
function today() { return new Date().toISOString().split('T')[0]; }
function makeId(prefix) { return `${prefix}-${Date.now().toString(36)}`; }

// --- Core Functions ---

function init() {
  ensureDir();
  if (!fs.existsSync(SUBJECTS_FILE)) saveJSON(SUBJECTS_FILE, { subjects: [], version: '1.0' });
  if (!fs.existsSync(SESSIONS_FILE)) saveJSON(SESSIONS_FILE, { sessions: [], version: '1.0' });
  if (!fs.existsSync(PROGRESS_FILE)) saveJSON(PROGRESS_FILE, { computed_at: nowISO(), subjects: {} });
  console.log('✅ Learning Tracker initialized.');
}

function addSubject(name, category = 'General', opts = {}) {
  const data = loadJSON(SUBJECTS_FILE, { subjects: [] });
  const id = makeId('subj');
  const subject = {
    id,
    name,
    category,
    status: 'active',
    priority: Number(opts.priority) || 2,
    dependencies: Array.isArray(opts.dependencies) ? opts.dependencies : [],
    estimated_hours: Number(opts.hours) || 10,
    completed_hours: 0,
    sessions_count: 0,
    created: nowISO()
  };
  data.subjects.push(subject);
  saveJSON(SUBJECTS_FILE, data);
  console.log(`📚 Subject added: "${name}" (${id})`);
  return subject;
}

function logSession(subjectId, durationMinutes, topic, opts = {}) {
  const subjectsData = loadJSON(SUBJECTS_FILE, { subjects: [] });
  const subject = subjectsData.subjects.find(s => s.id === subjectId);
  if (!subject) { console.error(`❌ Subject not found: ${subjectId}`); return; }

  const sessionsData = loadJSON(SESSIONS_FILE, { sessions: [] });
  const session = {
    id: makeId('sess'),
    subject_id: subjectId,
    date: today(),
    duration_minutes: Number(durationMinutes),
    topic: topic || 'General study',
    rating: Number(opts.rating) || 3,
    notes: opts.notes || '',
    created: nowISO()
  };
  sessionsData.sessions.push(session);
  saveJSON(SESSIONS_FILE, sessionsData);

  // Update subject totals
  subject.completed_hours += Number(durationMinutes) / 60;
  subject.sessions_count += 1;
  saveJSON(SUBJECTS_FILE, subjectsData);

  console.log(`📝 Session logged: ${durationMinutes}m on "${subject.name}" — ${topic}`);
  return session;
}

function computeProgress() {
  const subjectsData = loadJSON(SUBJECTS_FILE, { subjects: [] });
  const sessionsData = loadJSON(SESSIONS_FILE, { sessions: [] });
  const progress = { computed_at: nowISO(), subjects: {} };

  for (const subj of subjectsData.subjects) {
    const subjSessions = sessionsData.sessions.filter(s => s.subject_id === subj.id);
    const totalMinutes = subjSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const pct = subj.estimated_hours > 0 ? Math.min(100, (totalHours / subj.estimated_hours) * 100).toFixed(1) : 0;
    const avgRating = subjSessions.length
      ? (subjSessions.reduce((sum, s) => sum + (s.rating || 3), 0) / subjSessions.length).toFixed(1)
      : 0;

    progress.subjects[subj.id] = {
      name: subj.name,
      category: subj.category,
      status: subj.status,
      priority: subj.priority,
      estimated_hours: subj.estimated_hours,
      completed_hours: Number(totalHours.toFixed(2)),
      sessions_count: subjSessions.length,
      completion_pct: Number(pct),
      avg_rating: Number(avgRating),
      last_study: subjSessions.length ? subjSessions[subjSessions.length - 1].date : null
    };
  }

  saveJSON(PROGRESS_FILE, progress);
  return progress;
}

function showProgress() {
  const progress = computeProgress();
  console.log('\n📊 Learning Progress');
  console.log('═'.repeat(60));
  const entries = Object.values(progress.subjects);
  if (!entries.length) { console.log('No subjects tracked yet.'); return; }

  for (const p of entries) {
    const barLen = 20;
    const filled = Math.round((p.completion_pct / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    const statusIcon = p.completion_pct >= 100 ? '✅' : p.completion_pct > 50 ? '🟡' : '🔵';
    console.log(`${statusIcon} ${p.name} (${p.category})`);
    console.log(`   ${bar} ${p.completion_pct}% | ${p.completed_hours}/${p.estimated_hours}h | ${p.sessions_count} sessions | ⭐ ${p.avg_rating}`);
    if (p.last_study) console.log(`   Last studied: ${p.last_study}`);
    console.log('');
  }
  return progress;
}

function suggestNext() {
  const progress = computeProgress();
  const entries = Object.values(progress.subjects).filter(p => p.status === 'active');
  if (!entries.length) { console.log('No active subjects.'); return; }

  // Score: lower completion = higher priority, higher priority = higher score, recent study = lower
  const scored = entries.map(p => {
    const daysSinceLastStudy = p.last_study
      ? Math.floor((new Date() - new Date(p.last_study)) / 86400000)
      : 999;
    const freshnessPenalty = Math.max(0, daysSinceLastStudy * 0.5);
    const score = (p.priority * 10) + (100 - p.completion_pct) - freshnessPenalty;
    return { ...p, score: Number(score.toFixed(1)), daysSinceLastStudy };
  });

  scored.sort((a, b) => b.score - a.score);

  console.log('\n💡 Suggested Next Topics (by priority + progress gap + recency)');
  console.log('═'.repeat(60));
  for (const s of scored.slice(0, 5)) {
    const urgency = s.completion_pct < 30 ? '🔥' : s.completion_pct < 70 ? '➡️' : '✅';
    const recencyText = s.daysSinceLastStudy > 30 ? ' (stale!)' : s.daysSinceLastStudy === 0 ? ' (today)' : '';
    console.log(`${urgency} ${s.name} — ${s.completion_pct}% done, score ${s.score}${recencyText}`);
  }
  return scored;
}

function listSubjects() {
  const data = loadJSON(SUBJECTS_FILE, { subjects: [] });
  console.log('\n📚 All Subjects');
  console.log('═'.repeat(50));
  for (const s of data.subjects) {
    console.log(`${s.status === 'active' ? '🔵' : '⚪'} ${s.name} [${s.category}] — ${s.completed_hours.toFixed(1)}/${s.estimated_hours}h (${s.sessions_count} sessions)`);
  }
}

function listSessions(limit = 10) {
  const data = loadJSON(SESSIONS_FILE, { sessions: [] });
  const recent = data.sessions.slice(-limit).reverse();
  console.log(`\n📝 Last ${recent.length} Sessions`);
  console.log('═'.repeat(60));
  for (const s of recent) {
    console.log(`${s.date} | ${s.duration_minutes}m | ⭐${s.rating} | ${s.topic}`);
    if (s.notes) console.log(`   📝 ${s.notes}`);
  }
}

// --- CLI ---
function printHelp() {
  console.log(`
Usage: node learning_tracker.js <command> [args] [options]

Commands:
  init                          Initialize data files
  add-subject <name> [cat]      Add a learning subject
    --priority=<n>              Priority 1-3 (default 2)
    --hours=<n>                 Estimated hours (default 10)
    --dependencies=<a,b>        Comma-separated dependency IDs
  log <subjectId> <mins> [topic] Log a study session
    --rating=<1-5>              Session quality (default 3)
    --notes=<text>              Session notes
  progress                      Show progress dashboard
  suggest                       Suggest next topics to study
  list-subjects                 List all tracked subjects
  list-sessions [limit]         List recent sessions (default 10)
  help                          Show this help
`);
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  const parseOpts = (idx) => {
    const opts = {};
    for (let i = idx; i < args.length; i++) {
      const m = args[i].match(/^--(\w+)=?(.*)$/);
      if (m) {
        const key = m[1];
        let val = m[2] !== undefined ? m[2] : args[++i];
        if (key === 'dependencies') val = val.split(',').map(v => v.trim());
        if (['priority','hours','rating'].includes(key)) val = Number(val);
        opts[key] = val;
      }
    }
    return opts;
  };

  switch (cmd) {
    case 'init':
      init();
      break;
    case 'add-subject': {
      const name = args[1];
      const category = args[2] || 'General';
      if (!name) { console.error('Usage: add-subject <name> [category]'); process.exit(1); }
      addSubject(name, category, parseOpts(3));
      break;
    }
    case 'log': {
      const subjectId = args[1];
      const mins = args[2];
      const topic = args[3] || '';
      if (!subjectId || !mins) { console.error('Usage: log <subjectId> <minutes> [topic]'); process.exit(1); }
      logSession(subjectId, mins, topic, parseOpts(4));
      break;
    }
    case 'progress':
      showProgress();
      break;
    case 'suggest':
      suggestNext();
      break;
    case 'list-subjects':
      listSubjects();
      break;
    case 'list-sessions':
      listSessions(Number(args[1]) || 10);
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

main();
