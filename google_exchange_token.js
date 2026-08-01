const { google } = require('googleapis');
const fs = require('fs');

// The authorization code from the URL
const authorizationCode = '4/0AXEQxIAnsVbB3GakvQiVK_J-cj-oh7rn56pJziakIMBv6KyJW0GD_vxxr2Ubgn4fVb80HQ';

// Load credentials
const credentials = JSON.parse(fs.readFileSync('google_credentials.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000/oauth2callback');

async function getToken() {
    try {
        console.log('Exchanging authorization code for tokens...');
        const { tokens } = await oAuth2Client.getToken(authorizationCode);
        
        console.log('✅ Token received!');
        console.log('Access token:', tokens.access_token.substring(0, 20) + '...');
        console.log('Refresh token:', tokens.refresh_token ? 'Present ✅' : 'Not present ❌');
        console.log('Expiry:', new Date(tokens.expiry_date).toLocaleString());
        
        // Save tokens
        fs.writeFileSync('google_token.json', JSON.stringify(tokens, null, 2));
        console.log('Tokens saved to google_token.json');
        
        // Store in credential manager
        const { storeCredential } = require('./credential_manager');
        storeCredential('google_token', 'quentin.fabre05arme', tokens.refresh_token || tokens.access_token);
        
        console.log('');
        console.log('🎉 GOOGLE OAUTH COMPLETE!');
        console.log('I now have access to:');
        console.log('  ✅ Gmail (read/send)');
        console.log('  ✅ Google Calendar');
        console.log('  ✅ Google Drive (read)');
        
    } catch (error) {
        console.error('❌ Token exchange failed:', error.message);
        if (error.response && error.response.data) {
            console.error('Error details:', error.response.data);
        }
    }
}

getToken();
