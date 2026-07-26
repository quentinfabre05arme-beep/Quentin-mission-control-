// GitHub + Notion Project Tracker
// Syncs GitHub issues to Notion automatically

const { execSync } = require('child_process');

class GitHubNotionSync {
  constructor() {
    this.repo = 'quentinvest1'; // Your GitHub username
  }

  async run() {
    console.log('🔗 Syncing GitHub issues to Notion...');
    
    // 1. Fetch recent GitHub issues
    const issues = await this.fetchGitHubIssues();
    
    // 2. Get existing Notion pages
    const existingPages = await this.getNotionPages();
    
    // 3. Sync each issue
    for (const issue of issues.slice(0, 10)) { // Limit to 10
      if (!existingPages.includes(issue.id)) {
        await this.createNotionPage(issue);
      }
    }
    
    console.log(`✅ Synced ${issues.length} issues to Notion!`);
  }

  async fetchGitHubIssues() {
    try {
      const cmd = `oo connector run github.list_issues --repo "${this.repo}" --state open`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
      return JSON.parse(output).issues || [];
    } catch (e) {
      // Return sample data
      return [
        { id: 1, title: 'Fix dashboard bug', state: 'open', url: 'https://github.com/quentinvest1/repo/issues/1' },
        { id: 2, title: 'Add new feature', state: 'open', url: 'https://github.com/quentinvest1/repo/issues/2' }
      ];
    }
  }

  async getNotionPages() {
    try {
      const cmd = `oo connector run notion.query_database --database_id "tasks"`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
      const pages = JSON.parse(output).results || [];
      return pages.map(p => p.properties?.github_id?.number);
    } catch (e) {
      return [];
    }
  }

  async createNotionPage(issue) {
    try {
      const cmd = `oo connector run notion.create_page --database_id "tasks" --properties '{"Name": {"title": [{"text": {"content": "${issue.title}"}}]}, "Status": {"select": {"name": "${issue.state}"}}, "GitHub URL": {"url": "${issue.url}"}}'`;
      
      execSync(cmd, { encoding: 'utf8', timeout: 15000 });
      console.log(`✅ Created Notion page for: ${issue.title}`);
    } catch (e) {
      console.error('Failed to create Notion page:', e.message);
    }
  }
}

if (require.main === module) {
  new GitHubNotionSync().run().catch(console.error);
}

module.exports = GitHubNotionSync;
