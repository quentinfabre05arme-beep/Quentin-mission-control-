/**
 * Memory Curator
 * Auto-maintain MEMORY.md and daily notes
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '..', '..', 'MEMORY.md');
const DAILY_NOTES_DIR = path.join(__dirname, '..', '..', 'memory');
const ARCHIVE_DIR = path.join(DAILY_NOTES_DIR, 'archive');

class MemoryCurator {
  constructor() {
    this.sections = {
      decisions: [],
      errors: [],
      improvements: [],
      projects: [],
      dates: []
    };
  }

  /**
   * Weekly review of daily notes
   */
  async weeklyReview() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Get daily notes from past week
    const notes = this.getDailyNotesSince(weekAgo);
    
    // Extract learnings
    const learnings = this.extractLearnings(notes);
    
    // Update MEMORY.md
    this.updateMemory(learnings);
    
    // Archive processed notes
    this.archiveNotes(notes);
    
    return {
      notesReviewed: notes.length,
      learningsAdded: learnings.length,
      archived: notes.length
    };
  }

  /**
   * Get daily notes since date
   */
  getDailyNotesSince(date) {
    if (!fs.existsSync(DAILY_NOTES_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(DAILY_NOTES_DIR)
      .filter(f => f.match(/\d{4}-\d{2}-\d{2}\.md$/))
      .map(f => ({
        file: f,
        date: new Date(f.replace('.md', ''))
      }))
      .filter(item => item.date >= date)
      .sort((a, b) => a.date - b.date);
    
    return files.map(item => ({
      ...item,
      content: fs.readFileSync(path.join(DAILY_NOTES_DIR, item.file), 'utf8')
    }));
  }

  /**
   * Extract learnings from notes
   */
  extractLearnings(notes) {
    const learnings = [];
    
    for (const note of notes) {
      const content = note.content;
      
      // Extract decisions
      const decisionMatches = content.match(/(?:decided|choice|chose|opted for)\s+(.+?)(?:\n|$)/gi);
      if (decisionMatches) {
        for (const match of decisionMatches) {
          learnings.push({
            type: 'decision',
            content: match.trim(),
            date: note.date,
            source: note.file
          });
        }
      }
      
      // Extract errors/lessons
      const errorMatches = content.match(/(?:error|mistake|failed|lesson learned)\s*:?\s*(.+?)(?:\n|$)/gi);
      if (errorMatches) {
        for (const match of errorMatches) {
          learnings.push({
            type: 'error',
            content: match.trim(),
            date: note.date,
            source: note.file
          });
        }
      }
      
      // Extract improvements
      const improvementMatches = content.match(/(?:improved|better|optimized|fixed)\s+(.+?)(?:\n|$)/gi);
      if (improvementMatches) {
        for (const match of improvementMatches) {
          learnings.push({
            type: 'improvement',
            content: match.trim(),
            date: note.date,
            source: note.file
          });
        }
      }
    }
    
    return learnings;
  }

  /**
   * Update MEMORY.md with new learnings
   */
  updateMemory(learnings) {
    if (!fs.existsSync(MEMORY_FILE)) {
      return;
    }
    
    let memory = fs.readFileSync(MEMORY_FILE, 'utf8');
    
    // Add new section for this week
    const weekSection = `\n\n## Auto-Extracted (${new Date().toISOString().split('T')[0]})\n\n### Decisions\n${learnings
      .filter(l => l.type === 'decision')
      .map(l => `- ${l.content} (${l.date.toDateString()})`)
      .join('\n') || 'None recorded'}\n\n### Errors Found\n${learnings
      .filter(l => l.type === 'error')
      .map(l => `- ${l.content} (${l.date.toDateString()})`)
      .join('\n') || 'None recorded'}\n\n### Improvements\n${learnings
      .filter(l => l.type === 'improvement')
      .map(l => `- ${l.content} (${l.date.toDateString()})`)
      .join('\n') || 'None recorded'}\n`;
    
    // Append to MEMORY.md
    fs.appendFileSync(MEMORY_FILE, weekSection);
  }

  /**
   * Archive processed notes
   */
  archiveNotes(notes) {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    
    for (const note of notes) {
      const sourcePath = path.join(DAILY_NOTES_DIR, note.file);
      const targetPath = path.join(ARCHIVE_DIR, note.file);
      
      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * Monthly deep clean
   */
  async monthlyDeepClean() {
    if (!fs.existsSync(MEMORY_FILE)) {
      return { status: 'No MEMORY.md found' };
    }
    
    const memory = fs.readFileSync(MEMORY_FILE, 'utf8');
    
    // Find stale entries (> 90 days old)
    const staleRegex = /##\s+.*\(\d{4}-\d{2}-\d{2}\)/g;
    const matches = memory.match(staleRegex) || [];
    
    const now = new Date();
    const staleEntries = [];
    
    for (const match of matches) {
      const dateMatch = match.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        const entryDate = new Date(dateMatch[0]);
        const daysOld = (now - entryDate) / (1000 * 60 * 60 * 24);
        
        if (daysOld > 90) {
          staleEntries.push({
            section: match,
            date: entryDate,
            daysOld: Math.round(daysOld)
          });
        }
      }
    }
    
    return {
      staleEntries: staleEntries.length,
      suggestion: staleEntries.length > 0 
        ? `Consider archiving ${staleEntries.length} entries older than 90 days`
        : 'All entries are fresh'
    };
  }

  /**
   * Generate monthly summary
   */
  generateMonthlySummary(month, year) {
    const monthNotes = this.getDailyNotesSince(new Date(year, month - 1, 1))
      .filter(n => n.date.getMonth() === month - 1 && n.date.getFullYear() === year);
    
    const learnings = this.extractLearnings(monthNotes);
    
    const summary = `# Monthly Summary: ${month}/${year}\n\n` +
      `## Overview\n` +
      `- Days active: ${monthNotes.length}\n` +
      `- Learnings extracted: ${learnings.length}\n` +
      `- Decisions: ${learnings.filter(l => l.type === 'decision').length}\n` +
      `- Errors: ${learnings.filter(l => l.type === 'error').length}\n` +
      `- Improvements: ${learnings.filter(l => l.type === 'improvement').length}\n\n` +
      `## Key Themes\n` +
      `${this.extractThemes(learnings)}\n\n` +
      `## Action Items\n` +
      `${this.extractActionItems(learnings)}\n`;
    
    return summary;
  }

  extractThemes(learnings) {
    // Simple theme extraction by keyword grouping
    const themes = {};
    
    for (const learning of learnings) {
      const words = learning.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 5) {
          themes[word] = (themes[word] || 0) + 1;
        }
      }
    }
    
    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => `- ${theme} (${count} mentions)`)
      .join('\n');
  }

  extractActionItems(learnings) {
    return learnings
      .filter(l => l.type === 'decision' || l.type === 'improvement')
      .map(l => `- [ ] ${l.content}`)
      .join('\n');
  }
}

module.exports = MemoryCurator;
