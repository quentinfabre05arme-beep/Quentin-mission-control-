/**
 * PROJECT CLAW CORE — Audit Logger
 * Immutable audit trail of actions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const AUDIT_FILE = path.join(LOG_DIR, 'audit.jsonl');

function logAudit(action, actor, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    actor,
    details,
    hash: crypto.createHash('sha256').update(JSON.stringify({ action, actor, details })).digest('hex')
  };
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
  return entry;
}

function readAudit(limit = 100) {
  if (!fs.existsSync(AUDIT_FILE)) return [];
  const lines = fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map(JSON.parse);
}

class AuditLogger {
  log(action, actor, details) { return logAudit(action, actor, details); }
  read(limit) { return readAudit(limit); }
}

module.exports = { AuditLogger, logAudit, readAudit };

if (require.main === module) {
  const logger = new AuditLogger();
  logger.log('test_action', 'claw', { status: 'ok' });
  console.log(JSON.stringify(logger.read(5), null, 2));
}
