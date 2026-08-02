#!/usr/bin/env node
/**
 * 📧 EMAIL AUTONOMY ENGINE
 * Read, send, parse emails via Gmail API
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOKEN_FILE = path.join(__dirname, '..', '..', 'google_token.json');
const CREDS_FILE = path.join(__dirname, '..', '..', 'google_credentials.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'email.log');

// ─── AUTH ─────────────────────────────────────────────────
function getAccessToken() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    
    // Check if expired
    if (token.expiry_date && Date.now() > token.expiry_date) {
      // Would need refresh token logic here
      console.log('Token expired, may need refresh');
    }
    
    return token.access_token;
  } catch(e) {
    return null;
  }
}

// ─── API CALL ───────────────────────────────────────────────
function gmailApi(endpoint, method = 'GET', body = null) {
  const token = getAccessToken();
  if (!token) return { error: 'No access token' };
  
  try {
    let cmd = `curl -s -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`;
    if (body) cmd += ` -d '${JSON.stringify(body)}'`;
    cmd += ` "https://www.googleapis.com/gmail/v1${endpoint}"`;
    
    const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(result);
  } catch(e) {
    return { error: e.message, raw: e.stdout?.toString() };
  }
}

// ─── READ INBOX ───────────────────────────────────────────
function readInbox(maxResults = 10) {
  const result = gmailApi(`/me/messages?maxResults=${maxResults}&labelIds=INBOX`);
  
  if (result.error) return result;
  if (!result.messages) return { emails: [], count: 0 };
  
  return {
    emails: result.messages.map(m => ({
      id: m.id,
      threadId: m.threadId,
      snippet: '', // Would need to fetch each message
      labels: m.labelIds || []
    })),
    count: result.resultSizeEstimate || result.messages.length
  };
}

// ─── GET MESSAGE ──────────────────────────────────────────
function getMessage(id) {
  return gmailApi(`/me/messages/${id}`);
}

// ─── SEND EMAIL ───────────────────────────────────────────
function sendEmail(to, subject, body, html = false) {
  const contentType = html ? 'text/html' : 'text/plain';
  
  // Create raw MIME message (base64url encoded)
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: ${contentType}; charset=utf-8`,
    '',
    body
  ].join('\r\n');
  
  // Base64url encode
  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return gmailApi('/me/messages/send', 'POST', { raw: encoded });
}

// ─── LOG ────────────────────────────────────────────────────
function log(action, data) {
  const entry = `[${new Date().toISOString()}] ${action}: ${JSON.stringify(data)}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = {
  readInbox,
  getMessage,
  sendEmail,
  getAccessToken
};

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('📧 Email Autonomy Test');
  console.log('');
  
  const token = getAccessToken();
  console.log('Token:', token ? '✅ Valid' : '❌ Missing');
  
  if (token) {
    console.log('Reading inbox...');
    const inbox = readInbox(5);
    console.log('Emails:', inbox.count || inbox.emails?.length || 0);
    
    if (inbox.emails && inbox.emails.length > 0) {
      console.log('First email ID:', inbox.emails[0].id);
    }
  }
  
  console.log('');
  console.log('Email autonomy ready');
}
