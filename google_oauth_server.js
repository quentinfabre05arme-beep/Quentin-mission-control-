const http = require('http');
const url = require('url');
const fs = require('fs');
const { google } = require('googleapis');

// Load credentials
const credentials = JSON.parse(fs.readFileSync('google_credentials.json'));
const { client_secret, client_id } = credentials.installed;

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.readonly'
    ]
});

console.log('');
console.log('================================================');
console.log('  GOOGLE OAUTH - Ready for Authorization');
console.log('================================================');
console.log('');
console.log('STEP 1: Copy this URL:');
console.log('');
console.log(authUrl);
console.log('');
console.log('STEP 2: Paste it in Chrome (logged in as your Gmail)');
console.log('STEP 3: Click "Allow"');
console.log('STEP 4: The server will capture the code automatically');
console.log('');
console.log(`Callback server running on http://localhost:${PORT}`);
console.log('');

// Create HTTP server to handle callback
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;

    if (path === '/callback') {
        if (error) {
            console.error('❌ Authorization error:', error);
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;">
                <h1 style="color:red;">Authorization Failed</h1>
                <p>Error: ${error}</p>
                <p>Please try again.</p>
            </body></html>`);
            server.close();
            return;
        }

        if (code) {
            console.log('✅ Authorization code received!');
            console.log('Exchanging for tokens...');

            try {
                const { tokens } = await oAuth2Client.getToken(code);
                
                console.log('');
                console.log('🎉 SUCCESS! Tokens received:');
                console.log('  Access token:', tokens.access_token.substring(0, 20) + '...');
                console.log('  Refresh token:', tokens.refresh_token ? 'Present ✅' : 'Missing ❌');
                console.log('  Expires:', new Date(tokens.expiry_date).toLocaleString());
                
                // Save tokens
                fs.writeFileSync('google_token.json', JSON.stringify(tokens, null, 2));
                console.log('  Saved to: google_token.json');
                
                // Store in credential manager
                try {
                    const { storeCredential } = require('./credential_manager');
                    storeCredential('google_token', 'quentin.fabre05arme', tokens.refresh_token || tokens.access_token);
                } catch(e) {}
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:white;">
                    <h1 style="color:#4ecca3;">✅ Authorization Complete!</h1>
                    <p>OpenClaw now has access to your Google account.</p>
                    <p>You can close this window.</p>
                </body></html>`);
                
                console.log('');
                console.log('================================================');
                console.log('  GOOGLE API ACCESS GRANTED');
                console.log('================================================');
                console.log('  ✅ Gmail (read/send)');
                console.log('  ✅ Google Calendar');
                console.log('  ✅ Google Drive (read)');
                console.log('');

            } catch (err) {
                console.error('❌ Token exchange failed:', err.message);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<html><body>
                    <h1>Error</h1>
                    <p>${err.message}</p>
                </body></html>`);
            }

            server.close();
            return;
        }
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log('Waiting for authorization...');
});

// Timeout after 5 minutes
setTimeout(() => {
    console.log('');
    console.log('⏰ Timeout: No authorization received within 5 minutes.');
    console.log('Please try again.');
    server.close();
    process.exit(0);
}, 300000);
