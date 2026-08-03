// Voice Commands - Speech-to-text automation triggers
const { execSync } = require('child_process');
const fs = require('fs');

class VoiceCommandSystem {
  constructor() {
    this.commands = {
      'send report': this.sendReport.bind(this),
      'check market': this.checkMarket.bind(this),
      'check calendar': this.checkCalendar.bind(this),
      'check weather': this.checkWeather.bind(this),
      'run research': this.runResearch.bind(this),
      'sync files': this.syncFiles.bind(this),
      'status': this.getStatus.bind(this),
      'help': this.showHelp.bind(this)
    };
  }

  // Process voice command (text input for now)
  async processCommand(text) {
    console.log(`🎤 Processing: "${text}"`);
    
    const normalized = text.toLowerCase().trim();
    
    for (const [trigger, action] of Object.entries(this.commands)) {
      if (normalized.includes(trigger)) {
        console.log(`✅ Triggered: ${trigger}`);
        return await action();
      }
    }
    
    return { 
      success: false, 
      message: 'Unknown command. Say "help" for available commands.' 
    };
  }

  async sendReport() {
    try {
      const AutoReporting = require('./auto_reporting');
      const reporter = new AutoReporting();
      const result = await reporter.generateDailyReport();
      return { success: true, message: 'Daily report sent!' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async checkMarket() {
    try {
      const output = execSync('node mission_control/market_data_service.js', {
        cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
        encoding: 'utf8',
        timeout: 30000
      });
      return { success: true, message: 'Market data fetched', data: output.substring(0, 500) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async checkCalendar() {
    try {
      const cmd = 'oo connector run cal.list_schedules --days 1';
      const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
      const events = JSON.parse(output);
      return { success: true, message: `${events.events?.length || 0} events today` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async checkWeather() {
    try {
      const cmd = 'oo connector run wttr.in --location "Aix-en-Provence"';
      const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      return { success: true, message: output.substring(0, 200) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async runResearch() {
    try {
      const ResearchPipeline = require('../oomol_workflows/research_pipeline');
      const pipeline = new ResearchPipeline();
      await pipeline.run();
      return { success: true, message: 'Research pipeline complete!' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async syncFiles() {
    try {
      const FileLibrarianDrive = require('../oomol_workflows/file_librarian_drive');
      const librarian = new FileLibrarianDrive();
      await librarian.run();
      return { success: true, message: 'Files synced to Drive!' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getStatus() {
    try {
      const UnifiedDashboard = require('./unified_dashboard');
      const dashboard = new UnifiedDashboard();
      const status = await dashboard.checkAllServices();
      return { success: true, message: 'Status checked', data: status };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  showHelp() {
    return {
      success: true,
      message: 'Available commands:',
      commands: [
        'send report - Generate and email daily report',
        'check market - Get current market prices',
        'check calendar - Show today\'s events',
        'check weather - Get weather for Aix-en-Provence',
        'run research - Start research pipeline',
        'sync files - Sync files to Google Drive',
        'status - Check all service status'
      ]
    };
  }
}

if (require.main === module) {
  const voice = new VoiceCommandSystem();
  
  // Example usage:
  // voice.processCommand('check market').then(console.log);
  // voice.processCommand('send report').then(console.log);
  // voice.processCommand('help').then(console.log);
}

module.exports = VoiceCommandSystem;
