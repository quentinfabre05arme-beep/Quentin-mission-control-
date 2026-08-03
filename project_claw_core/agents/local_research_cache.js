/**
 * LOCAL RESEARCH CACHE v1.0
 * Indexes research markdown files and returns relevant excerpts.
 * Fallback when live web search is blocked.
 */

const fs = require('fs');
const path = require('path');

const RESEARCH_DIR = path.join(__dirname, '..', '..', 'research');

function listResearchFiles() {
  if (!fs.existsSync(RESEARCH_DIR)) return [];
  return fs.readdirSync(RESEARCH_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(RESEARCH_DIR, f));
}

function scoreLine(line, terms) {
  const lower = line.toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

function search(query, { topK = 5, contextLines = 2, maxChars = 800 } = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const files = listResearchFiles();
  const hits = [];

  for (const file of files) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const s = scoreLine(lines[i], terms);
        if (s > 0) {
          const start = Math.max(0, i - contextLines);
          const end = Math.min(lines.length, i + contextLines + 1);
          const context = lines.slice(start, end).join(' ').trim().slice(0, maxChars);
          hits.push({
            file: path.basename(file),
            line: context,
            score: s,
            source: 'local_research_cache'
          });
        }
      }
    } catch (e) {
      // skip unreadable files
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

module.exports = { search, listResearchFiles };

if (require.main === module) {
  const query = process.argv[2] || 'OpenClaw agent architecture';
  const r = search(query, { topK: 5 });
  console.log(`Local cache returned ${r.length} hits for "${query}"`);
  console.log(JSON.stringify(r, null, 2));
}
