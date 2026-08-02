/**
 * PROJECT CLAW CORE — Planner
 * Simple task planner that breaks goals into steps.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'planner.log');
const PLANS_FILE = path.join(__dirname, '..', 'data', 'plans.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class Planner {
  constructor() {
    this.plans = this.loadPlans();
  }
  
  loadPlans() {
    if (fs.existsSync(PLANS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf8'));
      } catch(e) {
        return { plans: [] };
      }
    }
    return { plans: [] };
  }
  
  savePlans() {
    fs.mkdirSync(path.dirname(PLANS_FILE), { recursive: true });
    fs.writeFileSync(PLANS_FILE, JSON.stringify(this.plans, null, 2));
  }
  
  createPlan(goal, steps = []) {
    log(`Creating plan: ${goal}`);
    const plan = {
      id: `plan_${Date.now()}`,
      goal,
      created_at: new Date().toISOString(),
      status: 'active',
      steps: steps.map((s, i) => ({
        id: `step_${i}`,
        description: typeof s === 'string' ? s : s.description,
        status: 'pending',
        dependencies: s.dependencies || []
      }))
    };
    this.plans.plans.push(plan);
    this.savePlans();
    return plan;
  }
  
  completeStep(planId, stepId) {
    const plan = this.plans.plans.find(p => p.id === planId);
    if (!plan) return { success: false, error: 'Plan not found' };
    
    const step = plan.steps.find(s => s.id === stepId);
    if (!step) return { success: false, error: 'Step not found' };
    
    step.status = 'completed';
    step.completed_at = new Date().toISOString();
    
    if (plan.steps.every(s => s.status === 'completed')) {
      plan.status = 'completed';
    }
    
    this.savePlans();
    return { success: true, plan };
  }
  
  getActivePlans() {
    return this.plans.plans.filter(p => p.status === 'active');
  }
}

module.exports = { Planner };

if (require.main === module) {
  const planner = new Planner();
  const plan = planner.createPlan('Make all capabilities functional', [
    'Build remaining core utilities',
    'Test each capability',
    'Run self audit',
    'Commit changes'
  ]);
  console.log(JSON.stringify(plan, null, 2));
}
