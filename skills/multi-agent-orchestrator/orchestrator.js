/**
 * Multi-Agent Orchestrator
 * Coordinate multiple skills/agents as a team
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');

class MultiAgentOrchestrator {
  constructor() {
    this.team = [];
    this.tasks = [];
    this.loadSkills();
  }

  loadSkills() {
    // Discover all available skills
    const skillDirs = fs.readdirSync(SKILLS_DIR)
      .filter(dir => fs.statSync(path.join(SKILLS_DIR, dir)).isDirectory())
      .filter(dir => fs.existsSync(path.join(SKILLS_DIR, dir, 'SKILL.md')));
    
    this.availableSkills = skillDirs.map(dir => ({
      name: dir,
      path: path.join(SKILLS_DIR, dir),
      loaded: true
    }));
  }

  /**
   * Create an agent team for a mission
   */
  createTeam(mission) {
    const team = [];
    
    // Analyze mission and select appropriate agents
    if (mission.includes('research') || mission.includes('analyze') || mission.includes('BTC') || mission.includes('trend')) {
      team.push({
        name: 'researcher',
        skills: ['proactive-research-scout', 'fact-checker'],
        role: 'Gather and verify information'
      });
    }
    
    if (mission.includes('deploy') || mission.includes('build') || mission.includes('create')) {
      team.push({
        name: 'builder',
        skills: ['deployment-guardian', 'coding-agent'],
        role: 'Build and deploy solutions'
      });
    }
    
    if (mission.includes('monitor') || mission.includes('health') || mission.includes('alert')) {
      team.push({
        name: 'monitor',
        skills: ['system-health-monitor', 'error-handler'],
        role: 'Monitor and maintain systems'
      });
    }
    
    if (mission.includes('content') || mission.includes('write') || mission.includes('publish')) {
      team.push({
        name: 'creator',
        skills: ['content-pipeline', 'social-media-manager'],
        role: 'Create and publish content'
      });
    }
    
    // Always add coordinator
    team.push({
      name: 'coordinator',
      skills: ['self-audit', 'pattern-extractor'],
      role: 'Coordinate team and track progress'
    });
    
    this.team = team;
    return team;
  }

  /**
   * Execute mission with team
   */
  async executeMission(mission) {
    console.log(`🚀 Starting mission: ${mission}`);
    
    // Create team
    const team = this.createTeam(mission);
    console.log(`👥 Team assembled (${team.length} agents):`);
    team.forEach(agent => console.log(`  - ${agent.name}: ${agent.role}`));
    
    // Break mission into tasks
    const tasks = this.breakIntoTasks(mission);
    
    // Assign tasks to agents
    const assignments = this.assignTasks(tasks, team);
    
    // Execute in parallel where possible
    const results = await this.executeParallel(assignments);
    
    // Aggregate results
    const summary = this.aggregateResults(results);
    
    return {
      mission,
      team: team.map(a => a.name),
      tasksCompleted: results.length,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  breakIntoTasks(mission) {
    // Simple task decomposition
    const tasks = [];
    
    if (mission.includes('research')) {
      tasks.push({ type: 'research', description: 'Gather information' });
    }
    
    if (mission.includes('build') || mission.includes('create')) {
      tasks.push({ type: 'build', description: 'Create solution' });
    }
    
    if (mission.includes('deploy')) {
      tasks.push({ type: 'deploy', description: 'Deploy to production' });
    }
    
    if (mission.includes('monitor')) {
      tasks.push({ type: 'monitor', description: 'Monitor results' });
    }
    
    return tasks.length > 0 ? tasks : [{ type: 'execute', description: mission }];
  }

  assignTasks(tasks, team) {
    return tasks.map(task => {
      // Find best agent for task
      const agent = team.find(a => 
        (task.type === 'research' && a.name === 'researcher') ||
        (task.type === 'build' && a.name === 'builder') ||
        (task.type === 'monitor' && a.name === 'monitor') ||
        (task.type === 'content' && a.name === 'creator') ||
        a.name === 'coordinator'
      ) || team[team.length - 1]; // Default to coordinator
      
      return { ...task, agent: agent.name };
    });
  }

  async executeParallel(assignments) {
    // Execute all tasks
    const results = [];
    
    for (const assignment of assignments) {
      console.log(`⚡ ${assignment.agent} executing: ${assignment.description}`);
      
      // Simulate execution (would call actual skills)
      const result = await this.executeTask(assignment);
      results.push(result);
    }
    
    return results;
  }

  async executeTask(assignment) {
    // Placeholder for actual skill execution
    return {
      task: assignment.description,
      agent: assignment.agent,
      status: 'completed',
      result: `Executed by ${assignment.agent}`,
      timestamp: new Date().toISOString()
    };
  }

  aggregateResults(results) {
    return {
      totalTasks: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      agents: [...new Set(results.map(r => r.agent))],
      duration: 'calculated'
    };
  }

  /**
   * Get team status
   */
  getTeamStatus() {
    return {
      active: this.team.length,
      availableSkills: this.availableSkills.length,
      missionsCompleted: this.tasks.filter(t => t.status === 'completed').length,
      team: this.team.map(a => ({
        name: a.name,
        role: a.role,
        skills: a.skills.length
      }))
    };
  }
}

module.exports = MultiAgentOrchestrator;
