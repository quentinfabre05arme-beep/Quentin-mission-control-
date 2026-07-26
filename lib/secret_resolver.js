/**
 * SecretRef resolver for scripts
 * Loads API keys from OpenClaw secrets configuration
 */

const fs = require('fs');
const path = require('path');

function getSecret(key) {
  // Try OpenClaw secrets file first
  const secretsPath = path.join(process.env.USERPROFILE || process.env.HOME, '.openclaw', 'secrets.json');
  
  if (fs.existsSync(secretsPath)) {
    try {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      if (secrets[key]) {
        return secrets[key];
      }
    } catch (e) {
      console.warn('Warning: Could not read secrets file:', e.message);
    }
  }
  
  // Fallback to environment variable
  const envKey = key.toUpperCase().replace(/-/g, '_');
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  
  throw new Error(`Secret "${key}" not found in secrets file or environment`);
}

module.exports = { getSecret };
