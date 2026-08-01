# Secure Credential Management for OpenClaw

## ⚠️ IMPORTANT SECURITY NOTICE

**Never send passwords in plain text through chat.** Use this secure method instead.

## Method: Encrypted Credential Files

### Step 1: Create Encrypted Credential File

I'll create a script that stores your credentials encrypted on disk:

```javascript
// credential_manager.js
const fs = require('fs');
const crypto = require('crypto');

// Generate or load encryption key
function getOrCreateKey() {
    const keyPath = './.claw_secret.key';
    if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath);
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Owner-only access
    console.log('🔐 Master key created. DO NOT SHARE this file.');
    return key;
}

function encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData, key) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Store credential
function storeCredential(service, username, password) {
    const key = getOrCreateKey();
    const data = JSON.stringify({ username, password, timestamp: new Date().toISOString() });
    const encrypted = encrypt(data, key);
    
    const credsPath = './credentials.enc';
    let creds = {};
    if (fs.existsSync(credsPath)) {
        creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    }
    creds[service] = encrypted;
    fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2), { mode: 0o600 });
    console.log(`✅ Credentials for ${service} stored securely.`);
}

// Retrieve credential
function getCredential(service) {
    const key = getOrCreateKey();
    const credsPath = './credentials.enc';
    if (!fs.existsSync(credsPath)) return null;
    
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (!creds[service]) return null;
    
    const decrypted = decrypt(creds[service], key);
    return JSON.parse(decrypted);
}

// CLI usage
const args = process.argv.slice(2);
if (args[0] === 'store') {
    storeCredential(args[1], args[2], args[3]);
} else if (args[0] === 'get') {
    const cred = getCredential(args[1]);
    if (cred) {
        console.log(`Username: ${cred.username}`);
        console.log(`Password: ${cred.password}`);
    } else {
        console.log('Credential not found.');
    }
} else {
    console.log('Usage: node credential_manager.js [store|get] [service] [username] [password]');
}

module.exports = { storeCredential, getCredential };
```

### Step 2: How to Add Your X Password

**Option A: Direct Command (You type this in terminal)**
```powershell
cd C:\Users\quent\.openclaw\workspace
node credential_manager.js store x_twitter "your_username" "your_password"
```

**Option B: Interactive Script**
```powershell
# I'll create an interactive script
node -e "
const readline = require('readline');
const { storeCredential } = require('./credential_manager');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Service name: ', service => {
    rl.question('Username: ', username => {
        rl.question('Password: ', password => {
            storeCredential(service, username, password);
            rl.close();
        });
    });
});
"
```

### Step 3: How I'll Use It

When I need to access X:
```javascript
const { getCredential } = require('./credential_manager');
const xCreds = getCredential('x_twitter');
// Use xCreds.username and xCreds.password for browser automation
```

## Alternative: Windows Credential Manager

More secure, Windows-native:

```powershell
# Store credential (you run this)
$credential = Get-Credential -Message "Enter X/Twitter credentials"
$credential | Export-Clixml -Path "$env:USERPROFILE\.x_credentials.xml"

# Retrieve (I can do this)
$creds = Import-Clixml "$env:USERPROFILE\.x_credentials.xml"
$username = $creds.UserName
$password = $creds.GetNetworkCredential().Password
```

## Alternative: Environment Variables

```powershell
# Add to system environment (you do this once)
[Environment]::SetEnvironmentVariable("X_USERNAME", "your_username", "User")
[Environment]::SetEnvironmentVariable("X_PASSWORD", "your_password", "User")

# I access via process.env.X_USERNAME
```

## What I Recommend

**Best balance of security and convenience:**
1. Use Windows Credential Manager (most secure)
2. Or encrypted file with master key (portable)
3. Never store in plain text or chat history

## Next Steps

1. **You choose method** (Credential Manager, encrypted file, or env vars)
2. **I'll create the setup script** for your chosen method
3. **You enter credentials once** (never in chat)
4. **I use them for browser automation** when needed

Which method do you prefer?

---
**Security Note:** Even with storage, I'll ask before posting anything on your behalf. The credentials enable navigation and reading, but external actions require explicit approval.
