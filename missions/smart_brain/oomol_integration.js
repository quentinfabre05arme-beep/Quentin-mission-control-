const { execSync } = require('child_process');

class OOMOLIntegration {
    constructor(options = {}) {
        this.apiKey = options.apiKey || null;
        this.connections = {
            github: 'quentinafabre05arme-beep',
            vercel: 'quentinafabre05arme-9901'
        };
    }

    runConnector(connector, params = {}) {
        try {
            const cmd = `oo connector run ${connector} --api-key ${this.apiKey} ${Object.entries(params).map(([k,v]) => `--${k} "${v}"`).join(' ')}`;
            const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
            return JSON.parse(output);
        } catch (e) {
            console.log(`[OOMOL] Connector ${connector} failed: ${e.message}`);
            return null;
        }
    }

    async pushToGitHub(filePath, commitMessage) {
        console.log(`[OOMOL] Pushing ${filePath} to GitHub...`);
        // Would use github.push or github.create_commit connector
        return this.runConnector('github.push', {
            repo: this.connections.github,
            path: filePath,
            message: commitMessage
        });
    }

    async deployToVercel(projectName) {
        console.log(`[OOMOL] Triggering Vercel deployment for ${projectName}...`);
        return this.runConnector('vercel.deploy', {
            project: projectName || this.connections.vercel
        });
    }

    async listGitHubIssues() {
        return this.runConnector('github.list_issues', {
            repo: this.connections.github,
            state: 'open'
        });
    }
}

module.exports = OOMOLIntegration;