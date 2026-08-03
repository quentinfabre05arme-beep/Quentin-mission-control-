const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve('missions/file_librarian');
const CATALOG_PATH = path.join(ROOT, 'catalog/catalog.json');
const INDEX_PATH = path.join(ROOT, 'catalog/content_index.json');
const WORKSPACE_INDEX_PATH = path.join(process.cwd(), 'content_index.json');
const TARGET_INDEX_PATH = fs.existsSync(WORKSPACE_INDEX_PATH) ? WORKSPACE_INDEX_PATH : INDEX_PATH;
const PROGRESS_PATH = path.join(ROOT, 'catalog/indexing_progress.json');
const LOG_DIR = path.join(process.cwd(), 'missions/file_librarian/logs');

const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '50', 10);

const READABLE_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.xml', '.yaml', '.yml', '.csv', '.tsv',
  '.html', '.htm', '.css', '.scss', '.sass', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.pyw', '.ps1', '.psm1', '.psd1', '.ps1xml', '.sh', '.bash', '.zsh',
  '.bat', '.cmd', '.sql', '.log', '.out', '.ini', '.conf', '.config', '.properties',
  '.rst', '.adoc'
]);

const SKIP_PATTERNS = [
  /node_modules/i, /\.git/i, /\.vs/i, /\bbin\b/i, /\bobj\b/i,
  /\bdist\b/i, /\bbuild\b/i, /__pycache__/i, /\.cache/i, /\btemp\b/i, /\btmp\b/i
];

function log(lines) {
  lines.forEach(l => console.log(l));
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function loadJson(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error loading ${filePath}: ${e.message}`);
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadTargetIndex() {
  if (!fs.existsSync(TARGET_INDEX_PATH)) {
    return {
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        total_files_indexed: 0,
        total_content_entries: 0,
        batch_number: 0,
        last_batch_size: 0,
        indexing_stats: {
          batches_completed: 0,
          files_read_this_session: 0,
          cumulative_files_indexed: 0,
          failed_reads: 0,
          topics_detected: {}
        }
      },
      files: []
    };
  }
  try {
    let content = fs.readFileSync(TARGET_INDEX_PATH, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const data = JSON.parse(content);
    if (!data.files) data.files = [];
    if (!Array.isArray(data.files)) {
      const arr = Object.entries(data.files).map(([filePath, entry]) => ({ path: normalizePath(filePath), ...entry }));
      data.files = arr;
    }
    if (!data.metadata) {
      data.metadata = {
        version: '1.0',
        created: new Date().toISOString(),
        total_files_indexed: data.files.length,
        total_content_entries: data.files.length,
        batch_number: 0,
        last_batch_size: 0,
        indexing_stats: { batches_completed: 0, files_read_this_session: 0, cumulative_files_indexed: data.files.length, failed_reads: 0, topics_detected: {} }
      };
    }
    return data;
  } catch (e) {
    console.error(`Error loading ${TARGET_INDEX_PATH}: ${e.message}`);
    return { metadata: { version: '1.0', created: new Date().toISOString(), total_files_indexed: 0, total_content_entries: 0, batch_number: 0, last_batch_size: 0, indexing_stats: {} }, files: [] };
  }
}

function saveTargetIndex(index) {
  index.metadata.last_updated = new Date().toISOString();
  index.metadata.total_files_indexed = index.files.length;
  index.metadata.total_content_entries = index.files.length;
  saveJson(TARGET_INDEX_PATH, index);
}

function shouldRead(filePath) {
  return !SKIP_PATTERNS.some(p => p.test(filePath));
}

function readFileWithFallbacks(filePath) {
  const maxBytes = 500000;
  const stats = fs.statSync(filePath);
  if (stats.size > maxBytes * 2) {
    return { success: false, error: `File too large (${stats.size} bytes)`, encoding: null };
  }

  const encodings = ['utf8', 'utf16le', 'ascii', 'latin1'];
  for (const encoding of encodings) {
    try {
      let content = fs.readFileSync(filePath, { encoding });
      if (encoding === 'utf16le' && content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      if (content && content.length > 0) {
        return { success: true, content, encoding };
      }
    } catch (e) {}
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.slice(0, maxBytes).toString('utf8', 0, Math.min(maxBytes, buffer.length));
    return { success: true, content, encoding: 'partial-utf8' };
  } catch (e) {
    return { success: false, error: `All read attempts failed: ${e.message}`, encoding: null };
  }
}

function extractSummary(content) {
  const clean = content.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
  return clean.length > 200 ? clean.substring(0, 200).trim() + '...' : clean;
}

function extractKeyPhrases(content) {
  const text = content.toLowerCase();
  const words = text.split(/\W+/).filter(w => w.length > 4);
  const counts = {};
  words.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
  return Object.entries(counts)
    .filter(([word, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function detectTopics(content) {
  const lower = content.toLowerCase();
  const topics = [];
  if (/btc|bitcoin|eth|ethereum|mstr|hims|crypto|trading|investment|portfolio|stock|dcf|valuation|price|fund|alpha|signal/.test(lower)) topics.push('investment');
  if (/printify|etsy|merch|product|listing|sale|revenue|pod|print-on-demand|t-shirt|design|shopify/.test(lower)) topics.push('pod_business');
  if (/dashboard|mission|automation|claw|agent|research|cycle|heartbeat|system|control|gateway|cron|schedule/.test(lower)) topics.push('mission_control');
  if (/code|script|function|class|module|api|dev|development|programming|node|python|javascript|typescript|powershell/.test(lower)) topics.push('development');
  if (/data|analysis|metrics|report|chart|statistics|insight|analytics|csv|json/.test(lower)) topics.push('data_analysis');
  if (/config|setting|parameter|option|environment|yaml|ini|env/.test(lower)) topics.push('configuration');
  if (/security|auth|password|token|credential|encrypt|ssh|firewall/.test(lower)) topics.push('security');
  if (/maintenance|health|monitor|cleanup|backup|repair|update/.test(lower)) topics.push('system_maintenance');
  return topics;
}

function computeHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

function updateHeartbeat(index) {
  const heartbeatPath = path.join(process.cwd(), 'HEARTBEAT.md');
  if (!fs.existsSync(heartbeatPath)) return;

  let content = fs.readFileSync(heartbeatPath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  const stats = index.metadata.indexing_stats || {};
  const total = index.files.length;
  const topics = stats.topics_detected || {};
  const topicList = Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t}: ${c}`)
    .join(', ');

  const sectionStart = content.indexOf('### 📚 File Librarian');
  if (sectionStart === -1) return;

  const nextH2 = content.indexOf('## ', sectionStart + 1);
  const sectionEnd = nextH2 === -1 ? content.length : nextH2;

  const newSection = `### 📚 File Librarian (Continuous Content Indexing)\n\n**Location:** \`missions/file_librarian/\`\n**Status:** ✅ **${total.toLocaleString()} files content-indexed across OneDrive + Workspace**\n\n### Quick Commands\n\`\`\`powershell\n# Search by filename (fast)\n.\\missions\\file_librarian\\find_file.ps1 -Query \"MSTR analysis\"\n\n# Semantic content search (understands meaning)\n.\\missions\\file_librarian\\search_content.ps1 -Query \"Bitcoin price analysis\"\n\n# Full catalog refresh\n.\\missions\\file_librarian\\scan_catalog.ps1\n\n# Build semantic index (continuous)\nnode missions/file_librarian/scripts/run_content_indexer.js --batch=50\n\`\`\`\n\n### Catalog Statistics\n| Metric | Value |\n|--------|-------|\n| **Total Files** | 22,937 |\n| **Total Size** | 53.22 GB |\n| **Readable Files** | ~737 (text/code/markdown) |\n| **Categories** | 6 (investment, pod_business, mission_control, development, personal, uncategorized) |\n| **Content Indexed** | **${total.toLocaleString()} files** (Batch #${index.metadata.batch_number} complete — ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}) |\n\n### Content Topics Auto-Detected\n${topicList || 'None yet'}\n\n### Self-Recurring Schedule\n| Job | Schedule | Purpose |\n|-----|----------|---------|\n| \`librarian-daily-scan\` | 06:00 daily | New file detection |\n| \`librarian-weekly-organization\` | Sundays 10:00 | Organization review |\n| \`librarian-monthly-deep-clean\` | 1st of month 08:00 | Full optimization |\n| \`librarian-content-indexer\` | Every 4 hours | Continuous content reading |\n\n**Next Action:** Continue indexing remaining readable files — ${(stats.files_read_this_session || 0)} files processed this run\n`;

  const newContent = content.slice(0, sectionStart) + newSection + content.slice(sectionEnd);
  fs.writeFileSync(heartbeatPath, newContent, 'utf8');
}

function main() {
  const now = new Date().toISOString();
  const logLines = [];
  logLines.push(`=== Content Indexing Batch ===`);
  logLines.push(`Started: ${now}`);
  logLines.push(`Batch size: ${BATCH_SIZE}`);
  logLines.push(`Target index: ${TARGET_INDEX_PATH}`);

  const catalog = loadJson(CATALOG_PATH, { files: [] });
  let index = loadTargetIndex();
  const progress = loadJson(PROGRESS_PATH, { last_processed_index: 0, total_indexed: 0 });

  logLines.push(`Catalog files: ${catalog.files?.length || 0}`);
  logLines.push(`Existing indexed files: ${index.files.length}`);

  const candidates = (catalog.files || []).filter(f => {
    const ext = (f.extension || path.extname(f.name)).toLowerCase();
    return READABLE_EXTENSIONS.has(ext) && shouldRead(f.path);
  });

  const existingPaths = new Set(index.files.map(f => normalizePath(f.path)));
  const unindexed = candidates.filter(f => !existingPaths.has(normalizePath(f.path)));

  logLines.push(`Unindexed readable files: ${unindexed.length}`);

  const batch = unindexed.slice(0, BATCH_SIZE);
  let processed = 0;
  let success = 0;
  let failed = 0;

  for (const file of batch) {
    processed++;
    const filePath = path.resolve(file.path);
    if (!fs.existsSync(filePath)) {
      logLines.push(`[${processed}/${batch.length}] SKIP: not found ${file.path}`);
      continue;
    }

    const readResult = readFileWithFallbacks(filePath);
    if (!readResult.success) {
      logLines.push(`[${processed}/${batch.length}] FAIL: ${file.path} — ${readResult.error}`);
      failed++;
      continue;
    }

    const content = readResult.content.substring(0, 500000);
    const summary = extractSummary(content);
    const keyPhrases = extractKeyPhrases(content);
    const topics = detectTopics(content);
    const hash = computeHash(content);

    index.files.push({
      path: normalizePath(file.path),
      size: file.size_bytes,
      mtime: file.modified,
      summary,
      key_phrases: keyPhrases,
      topics,
      hash,
      indexed: new Date().toISOString(),
      encoding: readResult.encoding
    });

    success++;
    logLines.push(`[${processed}/${batch.length}] OK: ${file.path} [${topics.join(', ') || 'uncategorized'}]`);

    if (processed % 10 === 0) {
      saveTargetIndex(index);
    }
  }

  const topicCounts = {};
  index.files.forEach(f => {
    (f.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  });

  index.metadata.batch_number = (index.metadata.batch_number || 0) + 1;
  index.metadata.last_batch_size = batch.length;
  index.metadata.indexing_stats = {
    batches_completed: index.metadata.batch_number,
    files_read_this_session: processed,
    cumulative_files_indexed: index.files.length,
    failed_reads: failed,
    topics_detected: topicCounts
  };

  saveTargetIndex(index);

  progress.total_indexed = index.files.length;
  saveJson(PROGRESS_PATH, progress);

  logLines.push('');
  logLines.push(`=== Batch Complete ===`);
  logLines.push(`Processed: ${processed}`);
  logLines.push(`Successful: ${success}`);
  logLines.push(`Failed: ${failed}`);
  logLines.push(`Total indexed: ${index.files.length}`);
  logLines.push(`Remaining: ${Math.max(0, unindexed.length - processed)}`);
  logLines.push(`Finished: ${new Date().toISOString()}`);

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, `content_index_${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(logFile, logLines.join('\n') + '\n\n', 'utf8');

  updateHeartbeat(index);

  log(logLines);
}

main();
