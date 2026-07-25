const message = require('openclaw').message;

/**
 * Mission Router - Routes mission updates to appropriate Telegram channels
 */

class MissionRouter {
  constructor() {
    this.channels = {
      'alpha-fund': '-5367479429',      // Alpha Fund Research
      'development': null,               // Claw Development (pending)
      'dashboard': null,                 // Mission Control (pending)
      'pod-business': null,              // POD Business (pending)
      'system-health': null              // System Health (pending)
    };
    
    this.activeMissions = new Map();
    this.defaultChannel = 'telegram:8685343197'; // Main chat fallback
  }

  // Register a new mission channel
  registerChannel(missionId, channelId) {
    this.channels[missionId] = channelId;
    console.log(`✅ Channel registered: ${missionId} → ${channelId}`);
  }

  // Route message to mission-specific channel
  async routeToMission(missionId, text) {
    const channelId = this.channels[missionId];
    
    if (!channelId) {
      console.log(`⚠️ No channel for ${missionId}, using main chat`);
      return this.sendToMain(text);
    }

    try {
      // Use target parameter for specific channel
      await message({
        action: "send",
        target: channelId,
        message: text
      });
      console.log(`📤 Sent to ${missionId}: ${text.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Failed to send to ${missionId}:`, error);
      // Fallback to main chat
      return this.sendToMain(`[${missionId}] ${text}`);
    }
  }

  // Send to main chat
  async sendToMain(text) {
    try {
      await message({
        action: "send",
        channel: "telegram",
        target: "8685343197",
        message: text
      });
    } catch (error) {
      console.error("❌ Failed to send to main:", error);
    }
  }

  // Get status of all channels
  getStatus() {
    const status = [];
    for (const [mission, channel] of Object.entries(this.channels)) {
      status.push({
        mission: mission,
        channel: channel || 'Not configured',
        status: channel ? '✅ Active' : '⬜ Pending'
      });
    }
    return status;
  }

  // Start tracking a mission
  startMission(missionId, config = {}) {
    this.activeMissions.set(missionId, {
      status: 'running',
      startedAt: new Date().toISOString(),
      config: config,
      updates: []
    });
    console.log(`🚀 Mission started: ${missionId}`);
  }

  // Log update to mission
  async logUpdate(missionId, update) {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.updates.push({
        timestamp: new Date().toISOString(),
        text: update
      });
    }
    
    // Route to appropriate channel
    return this.routeToMission(missionId, update);
  }

  // Complete mission
  completeMission(missionId, summary) {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.status = 'completed';
      mission.completedAt = new Date().toISOString();
      mission.summary = summary;
      
      this.routeToMission(missionId, `✅ Mission Complete: ${summary}`);
      console.log(`✅ Mission completed: ${missionId}`);
    }
  }
}

// Singleton instance
const router = new MissionRouter();

// Export for use
module.exports = router;

// If run directly, show status
if (require.main === module) {
  console.log('═══════════════════════════════════════════');
  console.log('🎯 Mission Router Status');
  console.log('═══════════════════════════════════════════\n');
  
  const status = router.getStatus();
  status.forEach(s => {
    console.log(`${s.mission}: ${s.status} (${s.channel})`);
  });
  
  console.log('\n───────────────────────────────────────────');
  console.log('Usage: const router = require("./mission_router");');
  console.log('router.routeToMission("alpha-fund", "Research complete!");');
}