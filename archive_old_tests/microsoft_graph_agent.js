/**
 * PROJECT CLAW CORE — Microsoft Graph Agent
 * Read/send Outlook email, manage calendar, OneDrive files.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { loadMicrosoftCreds } = require('./microsoft_graph_auth');

const TOKEN_PATH = path.join(__dirname, '..', '..', 'microsoft_token.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'microsoft_graph_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Microsoft token not found. Run microsoft_graph_auth.js first.');
  }
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
}

function graphRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const token = loadToken();
    const options = {
      hostname: 'graph.microsoft.com',
      path: '/v1.0' + endpoint,
      method,
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          resolve(json);
        } catch(e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

class MicrosoftGraphAgent {
  async getProfile() {
    log('Fetching user profile');
    return await graphRequest('/me');
  }
  
  async listEmails(max = 10) {
    log(`Listing ${max} emails`);
    const res = await graphRequest(`/me/messages?$top=${max}&$select=subject,from,receivedDateTime,bodyPreview`);
    return res.value || [];
  }
  
  async readEmail(id) {
    log(`Reading email ${id}`);
    return await graphRequest(`/me/messages/${id}`);
  }
  
  async sendEmail(to, subject, body) {
    log(`Sending email to ${to}`);
    const message = {
      message: {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }]
      }
    };
    return await graphRequest('/me/sendMail', 'POST', message);
  }
  
  async listEvents(days = 7, max = 20) {
    log(`Listing events next ${days} days`);
    const now = new Date().toISOString();
    const end = new Date(Date.now() + days * 86400000).toISOString();
    const res = await graphRequest(`/me/calendarview?startDateTime=${now}&endDateTime=${end}&$top=${max}`);
    return res.value || [];
  }
  
  async createEvent(summary, start, end, options = {}) {
    log(`Creating calendar event: ${summary}`);
    const event = {
      subject: summary,
      start: { dateTime: start, timeZone: 'Europe/Paris' },
      end: { dateTime: end, timeZone: 'Europe/Paris' },
      body: { contentType: 'Text', content: options.description || '' }
    };
    return await graphRequest('/me/events', 'POST', event);
  }
  
  async listOneDriveFiles(path = '/', max = 20) {
    log(`Listing OneDrive files: ${path}`);
    const endpoint = path === '/' ? '/me/drive/root/children' : `/me/drive/root:${path}:/children`;
    const res = await graphRequest(`${endpoint}?$top=${max}`);
    return res.value || [];
  }
  
  async searchOneDrive(query) {
    log(`Searching OneDrive: ${query}`);
    const res = await graphRequest(`/me/drive/search(q='${query.replace(/'/g, "\\'")}')`);
    return res.value || [];
  }
}

module.exports = { MicrosoftGraphAgent };

if (require.main === module) {
  (async () => {
    try {
      const agent = new MicrosoftGraphAgent();
      const profile = await agent.getProfile();
      console.log('Profile:', profile.displayName, profile.mail);
      
      const emails = await agent.listEmails(3);
      console.log('Emails:', emails.map(e => ({ subject: e.subject, from: e.from?.emailAddress?.address })));
    } catch(e) {
      console.error('Error:', e.message);
    }
  })();
}
