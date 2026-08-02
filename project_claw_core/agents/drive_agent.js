const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'drive_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class DriveAgent {
  constructor() {}
  async listFiles() {
    log('Listing Drive files'); return []; }
  async downloadFile(id, dest) {
    log('Downloading file ' + id); return { success: true }; }
  async uploadFile(source) {
    log('Uploading file ' + source); return { success: true }; }
}

module.exports = { DriveAgent };