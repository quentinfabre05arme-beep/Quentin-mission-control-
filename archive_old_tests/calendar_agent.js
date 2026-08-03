/**
 * PROJECT CLAW CORE — Calendar Agent
 * Read and create Google Calendar events.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', '..', 'google_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'google_credentials.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'calendar_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function loadAuth() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('google_credentials.json not found. Run Google OAuth setup first.');
  }
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('google_token.json not found. Complete OAuth first.');
  }
  
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || {};
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oauth2Client.setCredentials(token);
  
  return oauth2Client;
}

class CalendarAgent {
  constructor() {
    this.calendar = google.calendar({ version: 'v3', auth: loadAuth() });
  }
  
  async listEvents(days = 7, maxResults = 20) {
    log(`Listing events next ${days} days`);
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const res = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    return (res.data.items || []).map(e => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      description: e.description,
      location: e.location,
      organizer: e.organizer?.email
    }));
  }
  
  async createEvent(summary, startTime, endTime, options = {}) {
    log(`Creating event: ${summary}`);
    const event = {
      summary,
      description: options.description || '',
      location: options.location || '',
      start: {
        dateTime: startTime,
        timeZone: 'Europe/Paris'
      },
      end: {
        dateTime: endTime,
        timeZone: 'Europe/Paris'
      }
    };
    
    if (options.attendees) {
      event.attendees = options.attendees.map(a => ({ email: a }));
    }
    
    const res = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });
    
    log(`Event created: ${res.data.id}`);
    return { success: true, id: res.data.id, link: res.data.htmlLink };
  }
  
  async getFreeSlots(date, durationMinutes = 60) {
    log(`Finding free slots for ${date}`);
    const events = await this.listEvents(1, 50);
    // Simple placeholder — real implementation would parse busy intervals
    return events.filter(e => e.start && e.start.startsWith(date));
  }
}

module.exports = { CalendarAgent };

if (require.main === module) {
  (async () => {
    try {
      const agent = new CalendarAgent();
      const events = await agent.listEvents(7);
      console.log('EVENTS:', JSON.stringify(events, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    }
  })();
}
