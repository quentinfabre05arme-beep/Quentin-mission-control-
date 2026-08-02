/**
 * Stub Telegram helper — real sends go through OpenClaw message tool in sessions/cron.
 * This module exists only to satisfy orchestrator require when running outside OpenClaw.
 */
module.exports = {
  message: async () => ({ success: false, note: 'OpenClaw message tool not available in plain Node' })
};
