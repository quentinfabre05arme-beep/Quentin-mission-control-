# Google & Microsoft OAuth Setup Guide

## Step 1: Google OAuth (Google Cloud Console)

### 1.1 Create a Google Cloud Project
1. Go to: https://console.cloud.google.com/
2. Sign in with your Gmail: quentin.fabre05arme@gmail.com
3. Create a new project (e.g., "OpenClaw Automation")
4. Wait for project creation

### 1.2 Enable APIs
1. Go to "APIs & Services" > "Library"
2. Enable these APIs:
   - ✅ Gmail API
   - ✅ Google Calendar API
   - ✅ Google Drive API
   - ✅ Google Sheets API (optional)

### 1.3 Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure consent screen:
   - User Type: External
   - App name: "OpenClaw Automation"
   - User support email: quentin.fabre05arme@gmail.com
   - Developer contact: quentin.fabre05arme@gmail.com
4. Scopes needed:
   - `https://www.googleapis.com/auth/gmail.readonly` (read emails)
   - `https://www.googleapis.com/auth/gmail.send` (send emails)
   - `https://www.googleapis.com/auth/calendar` (calendar full access)
   - `https://www.googleapis.com/auth/drive.readonly` (read drive files)
5. Application type: Desktop app
6. Download the JSON file (save as `google_credentials.json`)

### 1.4 Test Connection
```javascript
const { google } = require('googleapis');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('google_credentials.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.readonly'
    ]
});

console.log('Authorize this app by visiting:', authUrl);
```

---

## Step 2: Microsoft OAuth (Azure Portal)

### 2.1 Register Application
1. Go to: https://portal.azure.com/
2. Sign in with your Microsoft account
3. Go to "Microsoft Entra ID" > "App registrations"
4. Click "New registration"
   - Name: "OpenClaw Automation"
   - Supported account types: Personal Microsoft accounts only
   - Redirect URI: `http://localhost:3000/auth/callback`

### 2.2 Add API Permissions
1. Go to "API permissions" in your app
2. Add these Microsoft Graph permissions:
   - ✅ `Mail.Read` (read emails)
   - ✅ `Mail.Send` (send emails)
   - ✅ `Calendars.ReadWrite` (calendar access)
   - ✅ `Files.Read` (OneDrive files)
   - ✅ `User.Read` (basic profile)
3. Click "Grant admin consent"

### 2.3 Create Client Secret
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Name: "OpenClaw Secret"
4. Expiry: 24 months
5. Copy the secret value immediately (you can't see it again)

### 2.4 Test Connection
```javascript
const { Client } = require('@microsoft/microsoft-graph-client');

const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';
const tenantId = 'common'; // For personal accounts

// Will need to authenticate first
// I'll create the full auth flow once you provide the IDs
```

---

## Step 3: Store Credentials Securely

Once you have the credentials, store them:

```javascript
// Store Google credentials
node credential_manager.js store google_oauth "quentin.fabre05arme" "YOUR_CLIENT_SECRET"

// Store Microsoft credentials
node credential_manager.js store microsoft_oauth "Quentin.fabre" "YOUR_CLIENT_SECRET"
```

---

## Step 4: What I Can Do With APIs

### Google Suite
| Service | Read | Write | Actions |
|---------|------|-------|---------|
| Gmail | ✅ Emails, labels, attachments | ✅ Send emails | Filter, search, archive |
| Calendar | ✅ Events, availability | ✅ Create, update, delete | Check conflicts |
| Drive | ✅ Files, folders | ❌ Read-only for now | Download, list |

### Microsoft Suite
| Service | Read | Write | Actions |
|---------|------|-------|---------|
| Outlook | ✅ Emails, folders | ✅ Send emails | Filter, search |
| Calendar | ✅ Events, availability | ✅ Create, update | Meeting scheduling |
| OneDrive | ✅ Files, folders | ❌ Read-only for now | Download, list |
| Teams | ❌ | ❌ | Can be added later |

---

## Next Steps

1. **Create Google Cloud project** (takes 5 minutes)
2. **Download `google_credentials.json`**
3. **Register Azure app** (takes 5 minutes)
4. **Get client ID and secret**
5. **Send me the files/IDs** (I'll store them securely)
6. **I handle the OAuth flow** and token refresh

**Ready to start?** I can guide you through each step, or you can do it and send me the credential files.

---
*Generated: 2026-08-01*
