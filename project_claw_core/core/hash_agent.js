/**
 * PROJECT CLAW CORE — Hash Agent
 * Compute file hashes and verify integrity.
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'hash_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function hashFile(filePath, algorithm = 'sha256') {
  log(`Hashing ${filePath} with ${algorithm}`);
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve({
      success: true,
      algorithm,
      hash: hash.digest('hex'),
      file: path.resolve(filePath)
    }));
  });
}

function hashString(text, algorithm = 'sha256') {
  const hash = crypto.createHash(algorithm).update(text).digest('hex');
  return { success: true, algorithm, hash };
}

async function verifyFile(filePath, expectedHash, algorithm = 'sha256') {
  const result = await hashFile(filePath, algorithm);
  const matches = result.hash === expectedHash.toLowerCase();
  return { ...result, expected: expectedHash, matches };
}

class HashAgent {
  async hashFile(file, algorithm) {
    return await hashFile(file, algorithm);
  }
  hashString(text, algorithm) {
    return hashString(text, algorithm);
  }
  async verifyFile(file, expected, algorithm) {
    return await verifyFile(file, expected, algorithm);
  }
}

module.exports = { HashAgent, hashFile, hashString, verifyFile };

if (require.main === module) {
  (async () => {
    const agent = new HashAgent();
    const testFile = path.join(__dirname, '..', 'logs', 'compressor_test.zip');
    const result = await agent.hashFile(testFile);
    console.log(JSON.stringify(result, null, 2));
  })();
}
