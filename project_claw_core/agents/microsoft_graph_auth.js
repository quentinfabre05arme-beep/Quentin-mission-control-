/**
 * PROJECT CLAW CORE — Microsoft Graph Auth
 * OAuth2 flow to connect Microsoft account.
 */

const http = require('http');
const url = require('url');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getCredential } = require('../../credential_manager');

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
const TOKEN_PATH = path.join(__dirname, '..', '..', 'microsoft_token.json');

const SCOPES = [
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/Files.ReadWrite',
  'offline_access'
].join(' ');

function loadMicrosoftCreds() {
  const cred = getCredential('microsoft_graph');
  if (!cred) {
    throw new Error('Microsoft credentials not found. Run: Store-Microsoft-Credentials.bat');
  }
  const [tenantId, clientId] = cred.username.split(':');
  return { tenantId, clientId, clientSecret: cred.password };
}

function buildAuthUrl(tenantId, clientId) {
  const base = tenantId === 'common'
    ? 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    : `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES,
    state: 'claw_ms_auth'
  });
  return `${base}?${params.toString()}`;
}

function exchangeCode(tenantId, clientId, clientSecret, code) {
  return new Promise((resolve, reject) => {
    const tokenUrl = tenantId === 'common'
      ? 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
      : `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const data = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    
    const req = https.request(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data.toString())
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) return reject(new Error(`${json.error}: ${json.error_description}`));
          resolve(json);
        } catch(e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data.toString());
    req.end();
  });
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...token, created_at: new Date().toISOString() }, null, 2));
  console.log(`Token saved to ${TOKEN_PATH}`);
}

function startAuthServer() {
  const { tenantId, clientId, clientSecret } = loadMicrosoftCreds();
  const authUrl = buildAuthUrl(tenantId, clientId);
  
  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    if (parsed.pathname === '/oauth/callback') {
      const code = parsed.query.code;
      if (!code) {
        res.end('No code received');
        return;
      }
      
      try {
        const token = await exchangeCode(tenantId, clientId, clientSecret, code);
        saveToken(token);
        res.end('Microsoft account connected to Claw. You can close this window.');
      } catch(e) {
        res.end('Error: ' + e.message);
      } finally {
        server.close();
        process.exit(0);
      }
    } else {
      res.end('Claw Microsoft OAuth server');
    }
  });
  
  server.listen(PORT, () => {
    console.log('Open this URL in your browser and sign in:');
    console.log(authUrl);
  });
}

module.exports = { loadMicrosoftCreds, buildAuthUrl, startAuthServer, TOKEN_PATH };

if (require.main === module) {
  startAuthServer();
}
