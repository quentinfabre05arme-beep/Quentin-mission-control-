/**
 * PROJECT CLAW CORE — Feedback Loop
 * Collect and act on self-improvement feedback.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'feedback_loop.log');
const FEEDBACK_FILE = path.join(__dirname, '..', 'data', 'feedback.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class FeedbackLoop {
  constructor() {
    this.feedback = this.load();
  }
  
  load() {
    if (fs.existsSync(FEEDBACK_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
      } catch(e) {
        return { items: [] };
      }
    }
    return { items: [] };
  }
  
  save() {
    fs.mkdirSync(path.dirname(FEEDBACK_FILE), { recursive: true });
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(this.feedback, null, 2));
  }
  
  record(source, issue, action) {
    log(`Feedback recorded: ${source} — ${issue}`);
    const item = {
      id: `fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
      source,
      issue,
      action,
      status: 'open'
    };
    this.feedback.items.push(item);
    this.save();
    return { success: true, item };
  }
  
  resolve(id) {
    const item = this.feedback.items.find(i => i.id === id);
    if (item) {
      item.status = 'resolved';
      item.resolved_at = new Date().toISOString();
      this.save();
      return { success: true, item };
    }
    return { success: false, error: 'Feedback item not found' };
  }
  
  getOpen() {
    return this.feedback.items.filter(i => i.status === 'open');
  }
}

module.exports = { FeedbackLoop };

if (require.main === module) {
  const fb = new FeedbackLoop();
  const r = fb.record('self_audit', 'RAM above 90%', 'Trigger cleanup');
  console.log(JSON.stringify(r, null, 2));
  console.log('Open:', fb.getOpen().length);
}
