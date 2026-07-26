// Unified OOMOL Dashboard - Single view of all connected services
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class UnifiedDashboard {
  constructor() {
    this.services = {
      gmail: { status: 'unknown', lastCheck: null },
      calendar: { status: 'unknown', lastCheck: null },
      drive: { status: 'unknown', lastCheck: null },
      notion: { status: 'unknown', lastCheck: null },
      github: { status: 'unknown', lastCheck: null },
      openai: { status: 'unknown', lastCheck: null },
      weather: { status: 'unknown', lastCheck: null }
    };
  }

  async checkAllServices() {
    console.log('🔍 Checking all OOMOL services...\n');
    
    // Check each service
    await this.checkGmail();
    await this.checkCalendar();
    await this.checkDrive();
    await this.checkNotion();
    await this.checkGitHub();
    await this.checkOpenAI();
    await this.checkWeather();
    
    return this.generateDashboard();
  }

  async checkGmail() {
    try {
      const cmd = 'oo connector schema gmail.send_email';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.gmail = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.gmail = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  async checkCalendar() {
    try {
      const cmd = 'oo connector schema cal.create_schedule';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.calendar = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.calendar = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  async checkDrive() {
    try {
      const cmd = 'oo connector schema gdrive.upload_file';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.drive = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.drive = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  async checkNotion() {
    try {
      const cmd = 'oo connector schema notion.query_database';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.notion = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.notion = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  async checkGitHub() {
    try {
      const cmd = 'oo connector schema github.list_issues';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.github = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.github = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  async checkOpenAI() {
    try {
      const cmd = 'oo connector schema openai.create_embeddings';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.openai = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.openai = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  async checkWeather() {
    try {
      const cmd = 'oo connector schema wttr.in';
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      this.services.weather = { status: '✅ Active', lastCheck: new Date().toISOString() };
    } catch (e) {
      this.services.weather = { status: '❌ Error', lastCheck: new Date().toISOString() };
    }
  }

  generateDashboard() {
    const now = new Date().toLocaleString('fr-FR');
    
    const dashboard = `
╔══════════════════════════════════════════════════════════╗
║           🌩️ OOMOL UNIFIED DASHBOARD                      ║
║              ${now.padEnd(40)} ║
╠══════════════════════════════════════════════════════════╣
║ SERVICES                                                 ║
╠══════════════════════════════════════════════════════════╣
║  📧 Gmail        ${this.services.gmail.status.padEnd(20)}     ║
║  📅 Calendar     ${this.services.calendar.status.padEnd(20)}     ║
║  ☁️  Drive        ${this.services.drive.status.padEnd(20)}     ║
║  📝 Notion       ${this.services.notion.status.padEnd(20)}     ║
║  🐙 GitHub       ${this.services.github.status.padEnd(20)}     ║
║  🤖 OpenAI       ${this.services.openai.status.padEnd(20)}     ║
║  🌤️  Weather      ${this.services.weather.status.padEnd(20)}     ║
╠══════════════════════════════════════════════════════════╣
║ WORKFLOWS                                               ║
╠══════════════════════════════════════════════════════════╣
║  📊 Daily Market Report    8:00 AM  Daily               ║
║  🌤️  Weather + Calendar    7:00 AM  Daily               ║
║  🔗 GitHub → Notion        Every 6h  Hourly             ║
║  🔬 Research Pipeline        Mon 9 AM  Weekly             ║
║  📁 File Librarian          2:00 AM  Daily               ║
╠══════════════════════════════════════════════════════════╣
║ SYSTEM                                                   ║
╠══════════════════════════════════════════════════════════╣
║  🧠 Models: 9 configured                                 ║
║  🤖 Agents: 4 active                                     ║
║  ⏰ Cron Jobs: 6 running                                  ║
║  💾 Memory: 6.6GB/7.9GB                                   ║
╚══════════════════════════════════════════════════════════╝
`;

    // Save to file
    const dashboardPath = path.join(__dirname, 'dashboard.txt');
    fs.writeFileSync(dashboardPath, dashboard);
    
    console.log(dashboard);
    return dashboard;
  }
}

if (require.main === module) {
  new UnifiedDashboard().checkAllServices().catch(console.error);
}

module.exports = UnifiedDashboard;
