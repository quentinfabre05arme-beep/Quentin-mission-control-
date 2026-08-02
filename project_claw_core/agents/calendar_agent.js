const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'calendar_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class CalendarAgent {
  constructor() {
    this.authenticated = false;
  }

  async authenticate() {
    this.authenticated = true;
    log('Authenticated with Google Calendar');
    return true;
  }

  async listEvents(days = 7) {
    log('Listing events for next ' + days + ' days');
    return [];
  }

  async createEvent(summary, startTime, endTime) {
    log('Creating event: ' + summary);
    return { success: true, id: 'demo-' + Date.now() };
  }
}

module.exports = { CalendarAgent };