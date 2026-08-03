const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');

const WORKSPACE = 'C:\\Users\\quent\\.openclaw\\workspace';
const KEY_FILE = path.join(WORKSPACE, '.claw_secret.key');
const CREDS_FILE = path.join(WORKSPACE, '.credentials.enc');

function getOrCreateKey() {
    if (fs.existsSync(KEY_FILE)) {
        return fs.readFileSync(KEY_FILE);
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
    console.log('Master key created at:', KEY_FILE);
    console.log('Keep this file secure it encrypts all your credentials');
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

function storeCredential(service, username, password) {
    const key = getOrCreateKey();
    const data = JSON.stringify({ username, password, timestamp: new Date().toISOString() });
    const encrypted = encrypt(data, key);
    
    let creds = {};
    if (fs.existsSync(CREDS_FILE)) {
        creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    }
    creds[service] = encrypted;
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
    console.log(`Credentials for "${service}" stored securely.`);
    console.log(`Stored at: ${CREDS_FILE}`);
}

function getCredential(service) {
    if (!fs.existsSync(KEY_FILE) || !fs.existsSync(CREDS_FILE)) {
        return null;
    }
    const key = fs.readFileSync(KEY_FILE);
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    if (!creds[service]) return null;
    const decrypted = decrypt(creds[service], key);
    return JSON.parse(decrypted);
}

function listCredentials() {
    if (!fs.existsSync(CREDS_FILE)) {
        console.log('No credentials stored yet.');
        return;
    }
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    console.log('\nStored credentials:');
    Object.keys(creds).forEach(service => {
        const data = getCredential(service);
        console.log(`  - ${service}: ${data.username}`);
    });
}

function interactiveStoreGeneric() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\nSecure Credential Storage');
    console.log('==========================');

    rl.question('Service name (e.g., x_twitter, gmail, binance): ', service => {
        rl.question('Username/email: ', username => {
            rl.question('Password: ', { input: process.stdin, output: process.stdout }, password => {
                storeCredential(service, username, password.trim());
                rl.close();
            });
        });
    });
}

function interactiveStoreMicrosoft() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\nMicrosoft Graph App Registration');
    console.log('=================================');
    console.log('Register at https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
    console.log('Required permissions: Mail.ReadWrite, Calendars.ReadWrite, Files.ReadWrite, User.Read, offline_access\n');

    rl.question('Microsoft App Client ID: ', clientId => {
        rl.question('Microsoft Tenant ID (or "common" for personal accounts): ', tenantId => {
            rl.question('Microsoft Client Secret: ', { input: process.stdin, output: process.stdout }, clientSecret => {
                storeCredential('microsoft_graph', `${tenantId}:${clientId}`, clientSecret.trim());
                console.log('\nNext steps:');
                console.log('1. Run: node project_claw_core/agents/microsoft_graph_auth.js');
                console.log('2. Open the URL it prints in your browser');
                console.log('3. Sign in with your Microsoft account');
                console.log('4. The OAuth token will be saved to microsoft_token.json');
                rl.close();
            });
        });
    });
}

const args = process.argv.slice(2);
if (require.main === module) {
  if (args[0] === 'store') {
    const service = args[1];
    if (service === 'microsoft_graph') {
      interactiveStoreMicrosoft();
    } else if (args.length === 4) {
      storeCredential(args[1], args[2], args[3]);
    } else if (service) {
      interactiveStoreGeneric();
    } else {
      interactiveStoreGeneric();
    }
  } else if (args[0] === 'get') {
    const cred = getCredential(args[1]);
    if (cred) {
      console.log(JSON.stringify({ username: cred.username, password: '***REDACTED***' }));
    } else {
      console.log('Credential not found for:', args[1]);
    }
  } else if (args[0] === 'list') {
    listCredentials();
  } else {
    console.log('Usage:');
    console.log('  node credential_manager.js store [service] [username] [password]');
    console.log('  node credential_manager.js store microsoft_graph');
    console.log('  node credential_manager.js store              # interactive');
    console.log('  node credential_manager.js get [service]');
    console.log('  node credential_manager.js list');
  }
}

module.exports = { storeCredential, getCredential, listCredentials };
