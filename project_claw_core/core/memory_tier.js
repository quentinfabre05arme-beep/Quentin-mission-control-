/**
 * MEMORY TIER v1.0
 * Tiered memory: hot (session), warm (recent daily files), cold (archive).
 * Query-aware routing and forgetting based on age/access.
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');
const HOT_PATH = path.join(__dirname, '..', 'data', 'memory_hot.json');
const ACCESS_LOG_PATH = path.join(__dirname, '..', 'logs', 'memory_access.jsonl');

const HOT_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
const WARM_DAYS = 7;
const FORGET_DAYS = 30;

function ensureDirs() {
  [MEMORY_DIR, path.dirname(HOT_PATH), path.dirname(ACCESS_LOG_PATH)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadHot() {
  try {
    const raw = JSON.parse(fs.readFileSync(HOT_PATH, 'utf8'));
    // Evict old hot entries
    const now = Date.now();
    const filtered = Object.fromEntries(Object.entries(raw).filter(([_, v]) => (now - v.touched) < HOT_TTL_MS));
    return filtered;
  } catch (e) {
    return {};
  }
}

function saveHot(hot) {
  ensureDirs();
  fs.writeFileSync(HOT_PATH, JSON.stringify(hot, null, 2));
}

function logAccess(query, tier) {
  ensureDirs();
  fs.appendFileSync(ACCESS_LOG_PATH, JSON.stringify({ query, tier, at: new Date().toISOString() }) + '\n');
}

function listDailyFiles() {
  if (!fs.existsSync(MEMORY_DIR)) return [];
  return fs.readdirSync(MEMORY_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .map(f => ({ name: f, path: path.join(MEMORY_DIR, f), mtime: fs.statSync(path.join(MEMORY_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
}

function search(query, { topK = 5 } = {}) {
  ensureDirs();
  const q = (query || '').toLowerCase();
  const hot = loadHot();

  // 1. Hot tier
  const hotHits = Object.entries(hot)
    .filter(([k, _]) => k.toLowerCase().includes(q))
    .map(([k, v]) => ({ tier: 'hot', key: k, value: v.value, touched: v.touched }));

  if (hotHits.length) {
    logAccess(query, 'hot');
    return hotHits.slice(0, topK);
  }

  // 2. Warm tier (recent daily notes)
  const files = listDailyFiles();
  const warmCutoff = new Date();
  warmCutoff.setDate(warmCutoff.getDate() - WARM_DAYS);
  const warmFiles = files.filter(f => f.mtime > warmCutoff);

  const warmHits = [];
  for (const f of warmFiles) {
    const text = fs.readFileSync(f.path, 'utf8');
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(q)) {
        warmHits.push({ tier: 'warm', file: f.name, line: line.trim().slice(0, 200) });
      }
    }
  }

  if (warmHits.length) {
    logAccess(query, 'warm');
    return warmHits.slice(0, topK);
  }

  // 3. Cold tier (archive / MEMORY.md)
  const coldHits = [];
  const memoryMd = path.join(path.dirname(MEMORY_DIR), 'MEMORY.md');
  if (fs.existsSync(memoryMd)) {
    const text = fs.readFileSync(memoryMd, 'utf8');
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(q)) {
        coldHits.push({ tier: 'cold', file: 'MEMORY.md', line: line.trim().slice(0, 200) });
      }
    }
  }

  logAccess(query, 'cold');
  return coldHits.slice(0, topK);
}

function setHot(key, value) {
  const hot = loadHot();
  hot[key] = { value, touched: Date.now() };
  saveHot(hot);
}

function forgetOld() {
  const files = listDailyFiles();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FORGET_DAYS);
  const removed = [];
  for (const f of files) {
    if (f.mtime < cutoff) {
      const archiveDir = path.join(MEMORY_DIR, 'archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(f.path, path.join(archiveDir, f.name));
      removed.push(f.name);
    }
  }
  return removed;
}

module.exports = { search, setHot, forgetOld, loadHot, listDailyFiles };

if (require.main === module) {
  const query = process.argv[2] || 'health status';
  console.log(JSON.stringify(search(query), null, 2));
}
