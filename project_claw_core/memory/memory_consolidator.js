/**
 * PROJECT CLAW CORE — Memory Consolidator
 * Summarize daily memory files into long-term memory.
 */

const fs = require('fs');
const path = require('path');
const { LongTermMemory } = require('../memory/long_term_memory');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'memory_consolidator.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class MemoryConsolidator {
  constructor() {
    this.memory = new LongTermMemory();
  }
  
  consolidateDaily(day = new Date().toISOString().slice(0, 10)) {
    const file = path.join(__dirname, '..', '..', 'memory', `${day}.md`);
    if (!fs.existsSync(file)) {
      return { success: false, error: 'No daily memory file found' };
    }
    
    log(`Consolidating memory for ${day}`);
    const content = fs.readFileSync(file, 'utf8');
    
    // Extract key facts: commits, capabilities, blockers
    const commits = [...content.matchAll(/Commit[:\s]+`?([a-f0-9]{7,})`?/g)].map(m => m[1]);
    const capabilities = [...content.matchAll(/\*\*([^*]+)\*\* ✅/g)].map(m => m[1].trim());
    const blockers = [...content.matchAll(/(?:Blocker|BLOCKED)[^\n]*/g)].map(m => m[0].trim()).slice(0, 5);
    
    const summary = {
      day,
      total_chars: content.length,
      commits,
      capabilities: capabilities.slice(0, 20),
      blockers,
      snapshot: content.slice(0, 1000)
    };
    
    this.memory.set('daily_summaries', `day_${day}`, summary, 0.8);
    
    // Extract top lessons
    const lessons = [...content.matchAll(/(?:Lesson|Learning|Key learning)[^\n]*/gi)].map(m => m[0].trim()).slice(0, 5);
    if (lessons.length > 0) {
      this.memory.set('lessons', `lessons_${day}`, lessons, 0.9);
    }
    
    return { success: true, summary };
  }
  
  getRecent(days = 7) {
    return this.memory.getByCategory('daily_summaries', days);
  }
}

module.exports = { MemoryConsolidator };

if (require.main === module) {
  const consolidator = new MemoryConsolidator();
  const result = consolidator.consolidateDaily('2026-08-02');
  console.log(JSON.stringify(result, null, 2));
}
