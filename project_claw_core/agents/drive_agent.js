/**
 * PROJECT CLAW CORE — Google Drive Agent
 * List and download files from Google Drive.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', '..', 'google_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'google_credentials.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'drive_agent.log');
const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloads');

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

class DriveAgent {
  constructor() {
    this.drive = google.drive({ version: 'v3', auth: loadAuth() });
  }
  
  async listFiles(pageSize = 20, query = '') {
    log(`Listing Drive files: ${query || 'all'}`);
    const res = await this.drive.files.list({
      pageSize,
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)'
    });
    return res.data.files || [];
  }
  
  async search(name) {
    const safe = name.replace(/'/g, "\\'");
    return await this.listFiles(20, `name contains '${safe}'`);
  }
  
  async download(fileId, fileName) {
    log(`Downloading: ${fileName} (${fileId})`);
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    const dest = path.join(DOWNLOAD_DIR, fileName);
    const fileStream = fs.createWriteStream(dest);
    
    return new Promise((resolve, reject) => {
      this.drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }, (err, res) => {
        if (err) return reject(err);
        res.data.pipe(fileStream);
        fileStream.on('finish', () => resolve({ success: true, path: dest }));
        fileStream.on('error', reject);
      });
    });
  }
  
  async exportSheets(fileId, fileName) {
    log(`Exporting Sheets: ${fileName}`);
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    const dest = path.join(DOWNLOAD_DIR, `${fileName}.xlsx`);
    const fileStream = fs.createWriteStream(dest);
    
    return new Promise((resolve, reject) => {
      this.drive.files.export({
        fileId,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }, { responseType: 'stream' }, (err, res) => {
        if (err) return reject(err);
        res.data.pipe(fileStream);
        fileStream.on('finish', () => resolve({ success: true, path: dest }));
        fileStream.on('error', reject);
      });
    });
  }
}

module.exports = { DriveAgent };

if (require.main === module) {
  (async () => {
    try {
      const agent = new DriveAgent();
      const files = await agent.listFiles(10);
      console.log(JSON.stringify(files, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    }
  })();
}
