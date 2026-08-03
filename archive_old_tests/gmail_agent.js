/**
 * PROJECT CLAW CORE — Gmail Agent
 * Read, send, and manage Gmail using Google API.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', '..', 'google_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'google_credentials.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'gmail_agent.log');

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

class GmailAgent {
  constructor() {
    this.gmail = google.gmail({ version: 'v1', auth: loadAuth() });
  }
  
  async listMessages(query = '', maxResults = 10) {
    log(`Listing messages: query=${query}, max=${maxResults}`);
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });
    return res.data.messages || [];
  }
  
  async getMessage(id) {
    log(`Fetching message ${id}`);
    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full'
    });
    return res.data;
  }
  
  decodeBody(payload) {
    let body = '';
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf8');
          break;
        }
      }
    } else if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf8');
    }
    return body;
  }
  
  async readInbox(maxResults = 5) {
    const messages = await this.listMessages('is:inbox', maxResults);
    const result = [];
    for (const msg of messages.slice(0, maxResults)) {
      try {
        const full = await this.getMessage(msg.id);
        const headers = full.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
        const from = headers.find(h => h.name === 'From')?.value || '(unknown)';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const snippet = full.snippet || '';
        result.push({ id: msg.id, subject, from, date, snippet });
      } catch(e) {
        log(`Error reading ${msg.id}: ${e.message}`);
      }
    }
    return result;
  }
  
  async sendEmail(to, subject, body) {
    log(`Sending email to ${to}: ${subject}`);
    const raw = this.makeRawEmail(to, subject, body);
    const res = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    log(`Email sent: ${res.data.id}`);
    return { success: true, id: res.data.id };
  }
  
  makeRawEmail(to, subject, body) {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      body
    ].join('\n');
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  async search(query, maxResults = 10) {
    const messages = await this.listMessages(query, maxResults);
    return messages;
  }
}

module.exports = { GmailAgent };

if (require.main === module) {
  (async () => {
    try {
      const agent = new GmailAgent();
      const inbox = await agent.readInbox(3);
      console.log('INBOX:', JSON.stringify(inbox, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    }
  })();
}
