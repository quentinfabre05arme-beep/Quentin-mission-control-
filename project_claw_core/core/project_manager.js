/**
 * PROJECT CLAW CORE — Project Manager
 * Manage project status and tasks.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'project_manager.log');
const PROJECTS_FILE = path.join(__dirname, '..', 'data', 'projects.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ProjectManager {
  constructor() {
    this.projects = this.load();
  }
  
  load() {
    if (fs.existsSync(PROJECTS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
      } catch(e) {
        return { projects: [] };
      }
    }
    return { projects: [] };
  }
  
  save() {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(this.projects, null, 2));
  }
  
  createProject(name, description = '') {
    log(`Creating project: ${name}`);
    const project = {
      id: `proj_${Date.now()}`,
      name,
      description,
      status: 'active',
      created_at: new Date().toISOString(),
      tasks: []
    };
    this.projects.projects.push(project);
    this.save();
    return { success: true, project };
  }
  
  addTask(projectId, task) {
    const project = this.projects.projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };
    project.tasks.push({
      id: `task_${Date.now()}`,
      description: task,
      status: 'todo',
      created_at: new Date().toISOString()
    });
    this.save();
    return { success: true, project };
  }
  
  listProjects() {
    return { success: true, count: this.projects.projects.length, projects: this.projects.projects };
  }
}

module.exports = { ProjectManager };

if (require.main === module) {
  const pm = new ProjectManager();
  const p = pm.createProject('Alpha Fund v4', 'Next-gen investment engine');
  pm.addTask(p.project.id, 'Build risk engine');
  console.log(JSON.stringify(pm.listProjects(), null, 2));
}
