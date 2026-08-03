const fs = require('fs');
const path = require('path');

const WORKSPACE = 'C:\\Users\\quent\\.openclaw\\workspace';
const INDEX_PATH = path.join(WORKSPACE, 'content_index.json');
const LOG_DIR = path.join(WORKSPACE, 'missions', 'file_librarian', 'logs');
const LOG_PATH = path.join(LOG_DIR, 'content_index_2026-07-24.log');

const TOPIC_KEYWORDS = {
  investment: ['fund', 'portfolio', 'bitcoin', 'crypto', 'stock', 'market', 'trading', 'finance', 'btc', 'eth', 'treasury', 'capital', 'asset'],
  pod_business: ['pod', 'print', 'design', 'mockup', 'sales', 'etsy', 'shopify', 'ecommerce', 'merch', 'product'],
  mission_control: ['mission', 'control', 'dashboard', 'review', 'cycle', 'hub', 'deploy', 'vercel'],
  development: ['function', 'class', 'script', 'code', 'api', 'module', 'programming', 'software', 'build', 'app', 'html', 'css'],
  automation: ['automate', 'scheduler', 'cron', 'robot', 'pipeline', 'orchestrate', 'batch', 'daemon', 'task'],
  social_media: ['x_account', 'twitter', 'tweet', 'post', 'engagement', 'follower', 'social', 'content', 'reply', 'thread'],
  data_analysis: ['analytics', 'metrics', 'chart', 'report', 'statistics', 'data', 'correlation', 'indicator', 'performance'],
  configuration: ['config', 'settings', 'setup', 'json', 'env', 'parameter', 'options', 'credentials', 'token'],
  security: ['password', 'encrypt', 'auth', 'token', 'secret', 'secure', 'key', 'ssh', 'firewall'],
  system_maintenance: ['backup', 'cleanup', 'repair', 'health', 'monitor', 'logs', 'maintenance', 'disk', 'cache']
};

const STOP_WORDS = new Set([
  'this','that','with','from','they','have','were','been','their','would','there','could','should',
  'these','those','while','where','when','what','which','who','how','about','into','than','only',
  'other','some','time','very','after','before','being','each','more','most','much','many','make',
  'such','take','come','know','just','like','over','also','back','well','even','here','then',
  'than','them','will','your','can','all','any','but','for','get','had','has','her','him','his',
  'how','its','may','not','now','our','out','see','she','the','use','was','way','you','are',
  'did','does','etc','get','got','had','has','his','how','its','let','new','now','off','old',
  'one','our','out','own','put','run','set','she','say','she','too','two','try','way','who',
  'why','yes','yet','you','return','function','const','import','print','self','async','await',
  'class','def','from','true','false','null','none','undefined','string','number','object',
  'array','typeof','instanceof','var','let','void','typeof','yield','break','continue','try',
  'catch','finally','throw','if','else','elif','for','in','while','do','switch','case','default',
  'pass','raise','except','global','nonlocal','lambda','assert','del','exec','eval','print'
]);

function normalizeForHash(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function generateHash(text) {
  const normalized = normalizeForHash(text);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
}

function extractKeyPhrases(text) {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function detectTopics(text) {
  const lower = text.toLowerCase();
  const topics = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      topics.push(topic);
    }
  }
  return topics;
}

function processFile(filePath) {
  try {
    const fullPath = path.join(WORKSPACE, filePath);
    if (!fs.existsSync(fullPath)) return { error: true, reason: 'not_found' };

    const stat = fs.statSync(fullPath);
    if (stat.size === 0) return { skipped: true, reason: 'empty' };
    if (stat.size > 500000) return { skipped: true, reason: 'too_large' };

    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
      try {
        content = fs.readFileSync(fullPath, 'latin1');
      } catch (e2) {
        return { error: true, reason: 'unreadable_encoding' };
      }
    }

    const summary = content.slice(0, 200).replace(/\s+/g, ' ').trim();
    const keyPhrases = extractKeyPhrases(content);
    const topics = detectTopics(content);
    const hash = generateHash(content);

    return {
      path: filePath,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      summary: summary,
      key_phrases: keyPhrases,
      topics: topics.length > 0 ? topics : ['uncategorized'],
      hash: hash,
      indexed: new Date().toISOString(),
      encoding: 'utf8'
    };
  } catch (err) {
    return { error: true, reason: err.message };
  }
}

function main() {
  const startTime = Date.now();
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const existingPaths = new Set(index.files.map(f => f.path.replace(/\\/g, '/').replace(/\\/g, '/')));

  const filesToIndex = [
    "content_quality_scorer.py",
    "conversation_summary.md",
    "copy_authors.ps1",
    "copy_books.ps1"
  ];

  const results = [];
  let success = 0, skipped = 0, errors = 0;
  const logLines = [];

  logLines.push(`=== FILE LIBRARIAN BATCH #2 (TOP-UP) ===`);
  logLines.push(`Date: ${new Date().toISOString()}`);
  logLines.push(`Target: ${filesToIndex.length} files`);
  logLines.push(`---`);

  for (const fp of filesToIndex) {
    const normPath = fp.replace(/\\/g, '/');
    if (existingPaths.has(normPath)) {
      logLines.push(`[SKIP] ${fp} — already indexed`);
      skipped++;
      continue;
    }

    const result = processFile(fp);
    if (result.error) {
      logLines.push(`[ERROR] ${fp} — ${result.reason}`);
      errors++;
    } else if (result.skipped) {
      logLines.push(`[SKIP] ${fp} — ${result.reason}`);
      skipped++;
    } else {
      results.push(result);
      logLines.push(`[OK] ${fp} — ${result.size}B | topics: [${result.topics.join(', ')}] | phrases: [${result.key_phrases.slice(0,5).join(', ')}...]`);
      success++;
    }
  }

  // Update index
  for (const entry of results) {
    index.files.push(entry);
    for (const topic of entry.topics) {
      if (!index.topics[topic]) index.topics[topic] = [];
      if (!index.topics[topic].includes(entry.path)) {
        index.topics[topic].push(entry.path);
      }
    }
  }

  index.metadata.last_updated = new Date().toISOString();
  index.metadata.total_files_indexed += success;
  index.metadata.last_batch_size += success;

  const extCounts = {};
  for (const f of index.files) {
    const ext = path.extname(f.path).toLowerCase() || '.unknown';
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }
  const topicCounts = {};
  for (const [topic, files] of Object.entries(index.topics)) {
    topicCounts[topic] = files.length;
  }
  index.statistics.by_extension = extCounts;
  index.statistics.by_topic = topicCounts;
  index.statistics.total_size_bytes = index.files.reduce((s, f) => s + f.size, 0);

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  logLines.push(`---`);
  logLines.push(`BATCH #2 COMPLETE`);
  logLines.push(`  Indexed: ${success}`);
  logLines.push(`  Skipped: ${skipped}`);
  logLines.push(`  Errors: ${errors}`);
  logLines.push(`  Total in index: ${index.files.length}`);
  logLines.push(`  Elapsed: ${elapsed}s`);

  // Append to log
  const existingLog = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') + '\n\n' : '';
  fs.writeFileSync(LOG_PATH, existingLog + logLines.join('\n'), 'utf8');

  console.log(JSON.stringify({ success, skipped, errors, total: index.files.length, elapsed }, null, 2));
}

main();
