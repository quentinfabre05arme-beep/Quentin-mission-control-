#!/usr/bin/env node
/**
 * Content Extractor — Extract, analyze, and save knowledge from documents
 *
 * Usage:
 *   node content_extractor.js --pdf <file.pdf>
 *   node content_extractor.js --text "Some text to analyze..."
 *   node content_extractor.js --file <document.txt>
 *   node content_extractor.js --text "..." --save --title "My Notes"
 *
 * Outputs structured analysis to stdout; with --save, writes to memory/YYYY-MM-DD.md
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────
const MEMORY_DIR = path.join(process.cwd(), 'memory');
const MAX_TEXT_LENGTH = 10000; // Truncate very long inputs for analysis

// ── Text analysis helpers ─────────────────────────────────────────────

function extractKeyConcepts(text, max = 15) {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOP_WORDS.has(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word, count]) => ({ word, count }));
}

function generateSummary(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const ranked = sentences.map(s => ({
    sentence: s.trim(),
    score: scoreSentence(s, text)
  }));
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 5).sort((a, b) =>
    text.indexOf(a.sentence) - text.indexOf(b.sentence)
  );
  return top.map(x => x.sentence);
}

function scoreSentence(sentence, fullText) {
  const s = sentence.toLowerCase();
  let score = 0;
  // Position: earlier sentences often have key info
  const pos = fullText.indexOf(sentence) / fullText.length;
  score += (1 - pos) * 2;
  // Length: not too short, not too long
  const len = sentence.split(/\s+/).length;
  if (len >= 8 && len <= 25) score += 1;
  // Keywords
  if (/important|significant|key|main|primary|critical|essential/.test(s)) score += 2;
  if (/result|finding|conclusion|summary|overall/.test(s)) score += 1.5;
  if (/\d{4}|\$\d+|\d+%|million|billion/.test(s)) score += 1;
  // Avoid weak starts
  if (/^\s*(this|that|it|they|there)\s/i.test(sentence)) score -= 1;
  return score;
}

function extractImportantFacts(text) {
  const facts = [];
  const patterns = [
    { regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi, label: 'Date' },
    { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, label: 'Date' },
    { regex: /\b\d{4}-\d{2}-\d{2}\b/g, label: 'Date' },
    { regex: /\$[\d,]+(\.\d+)?\s*(million|billion|trillion)?/gi, label: 'Financial' },
    { regex: /\b\d{1,3}(,\d{3})*\s*(users|customers|employees|people|members)/gi, label: 'Metric' },
    { regex: /\b\d+%/g, label: 'Percentage' },
    { regex: /"([^"]{10,200})"/g, label: 'Quote' },
    { regex: /\b[A-Z][a-z]+ (said|stated|announced|reported|claimed)\b/g, label: 'Statement' },
    { regex: /\b\d{4}\b/g, label: 'Year' },
    { regex: /\b(over|more than|at least|up to)\s+[\d,]+\b/gi, label: 'Quantity' },
    { regex: /\b(first|second|third|largest|smallest|biggest|major|primary|main)\b/gi, label: 'Significance' },
  ];
  for (const p of patterns) {
    const matches = text.matchAll(p.regex);
    for (const m of matches) {
      const snippet = text.substring(Math.max(0, m.index - 40), Math.min(text.length, m.index + m[0].length + 40));
      facts.push({ type: p.label, value: m[0], context: snippet.trim() });
    }
  }
  // Deduplicate by value
  const seen = new Set();
  return facts.filter(f => {
    if (seen.has(f.value)) return false;
    seen.add(f.value);
    return true;
  }).slice(0, 10);
}

function generateTldr(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const first = sentences[0]?.trim() || '';
  const second = sentences[1]?.trim() || '';
  // If first sentence is a good summary, use it; else combine
  const words = first.split(/\s+/).length;
  if (words >= 10 && words <= 40 && /[.!?]$/.test(first)) {
    return first;
  }
  return (first + ' ' + second).substring(0, 200).trim() + '...';
}

// ── PDF extraction ──────────────────────────────────────────────────────

async function extractPdfText(pdfPath) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error('pdf-parse not installed. Run: npm install pdf-parse');
    }
    throw err;
  }
}

// ── Stop words ────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'about','above','after','again','against','all','also','am','an','and','any','are',
  'aren','as','at','be','because','been','before','being','below','between','both',
  'but','by','can','cannot','could','couldn','did','didn','do','does','doesn','doing',
  'don','down','during','each','few','for','from','further','had','hadn','has','hasn',
  'have','haven','having','he','her','here','hers','herself','him','himself','his',
  'how','i','if','in','into','is','isn','it','its','itself','let','more','most','mustn',
  'my','myself','no','nor','not','now','of','off','on','once','only','or','other','our',
  'ours','ourselves','out','over','own','same','shan','she','should','shouldn','so',
  'some','such','than','that','the','their','theirs','them','themselves','then','there',
  'these','they','this','those','through','to','too','under','until','up','very','was',
  'wasn','we','were','weren','what','when','where','which','while','who','whom','why',
  'with','won','would','wouldn','you','your','yours','yourself','yourselves'
]);

// ── Memory saving ───────────────────────────────────────────────────────

function saveToMemory(analysis, title, source) {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  const date = new Date().toISOString().split('T')[0];
  const memoryPath = path.join(MEMORY_DIR, `${date}.md`);

  const entry = `
---
# Extracted: ${title}
**Source:** ${source}
**Date:** ${date}
**Time:** ${new Date().toISOString()}

## TL;DR
${analysis.tldr}

## Key Concepts
${analysis.concepts.map(c => `- **${c.word}** (${c.count} mentions)`).join('\n')}

## Summary
${analysis.summary.map(s => `- ${s}`).join('\n')}

## Important Facts
${analysis.facts.length > 0
  ? analysis.facts.map(f => `- **[${f.type}]** ${f.value} — "${f.context}"`).join('\n')
  : '- No specific facts detected'}

## Full Text (excerpt)
\`\`\`
${analysis.fullText.substring(0, 2000)}${analysis.fullText.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`
---
`;

  fs.appendFileSync(memoryPath, entry);
  return memoryPath;
}

// ── Main pipeline ───────────────────────────────────────────────────────

async function runExtraction(options) {
  let source = 'inline text';
  let fullText = '';
  let meta = {};

  if (options.pdf) {
    console.log(`📄 Extracting PDF: ${options.pdf}`);
    const pdfData = await extractPdfText(options.pdf);
    fullText = pdfData.text;
    meta = { pages: pdfData.pages, info: pdfData.info };
    source = `PDF: ${path.basename(options.pdf)} (${pdfData.pages} pages)`;
    console.log(`   Pages: ${pdfData.pages} | Text length: ${fullText.length} chars`);
  } else if (options.file) {
    fullText = fs.readFileSync(options.file, 'utf-8');
    source = `File: ${path.basename(options.file)}`;
  } else if (options.text) {
    fullText = options.text;
  } else {
    throw new Error('Provide --pdf, --file, or --text');
  }

  const textForAnalysis = fullText.length > MAX_TEXT_LENGTH
    ? fullText.substring(0, MAX_TEXT_LENGTH) + '\n... [truncated for analysis]'
    : fullText;

  console.log('\n🔍 Analyzing content...');

  const analysis = {
    tldr: generateTldr(textForAnalysis),
    concepts: extractKeyConcepts(textForAnalysis),
    summary: generateSummary(textForAnalysis),
    facts: extractImportantFacts(textForAnalysis),
    fullText,
    meta
  };

  // Output
  console.log('\n' + '═'.repeat(60));
  console.log('📋 EXTRACTION RESULT');
  console.log('═'.repeat(60));
  console.log(`\n📝 TL;DR:\n   ${analysis.tldr}\n`);

  console.log('🔑 Key Concepts:');
  analysis.concepts.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.word} (${c.count} mentions)`);
  });

  console.log('\n📊 Summary:');
  analysis.summary.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s}`);
  });

  console.log('\n💡 Important Facts:');
  if (analysis.facts.length > 0) {
    analysis.facts.forEach((f, i) => {
      console.log(`   ${i + 1}. [${f.type}] ${f.value}`);
      console.log(`       Context: "${f.context.substring(0, 80)}..."`);
    });
  } else {
    console.log('   No specific facts detected');
  }

  if (meta.pages) {
    console.log(`\n📄 PDF Metadata: ${meta.pages} pages`);
  }

  // Save to memory
  if (options.save) {
    const title = options.title || (options.pdf ? path.basename(options.pdf, '.pdf') : 'Extracted Content');
    const memoryPath = saveToMemory(analysis, title, source);
    console.log(`\n💾 Saved to memory: ${memoryPath}`);
  }

  return analysis;
}

// ── CLI ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pdf': options.pdf = args[++i]; break;
      case '--file': options.file = args[++i]; break;
      case '--text': options.text = args[++i]; break;
      case '--title': options.title = args[++i]; break;
      case '--save': options.save = true; break;
      case '--help':
        console.log(`
Content Extractor — Extract knowledge from documents

Usage:
  node content_extractor.js --pdf <file.pdf> [--save] [--title "Name"]
  node content_extractor.js --file <document.txt> [--save]
  node content_extractor.js --text "Text to analyze..." [--save]

Options:
  --pdf <path>     Extract from PDF file
  --file <path>    Extract from text file
  --text <text>    Extract from inline text
  --title <name>   Title for memory entry (default: filename)
  --save           Save results to memory/YYYY-MM-DD.md
  --help           Show this help
`);
        process.exit(0);
    }
  }
  return options;
}

// ── Run ───────────────────────────────────────────────────────────────

(async () => {
  try {
    const options = parseArgs();
    await runExtraction(options);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

module.exports = { runExtraction, extractKeyConcepts, generateSummary, extractImportantFacts, generateTldr };
