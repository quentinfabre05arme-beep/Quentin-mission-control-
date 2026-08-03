const fs = require('fs');
const path = require('path');

const agents = fs.readdirSync('project_claw_core/agents').filter(f => f.endsWith('.js'));
const activeRefs = {
  "business_intelligence.js": 1,
  "code_agent.js": 1,
  "content_factory.js": 1,
  "deploy_agent.js": 1,
  "design_agent.js": 1,
  "doc_generator.js": 1,
  "drive_agent.js": 1,
  "linkedin_agent.js": 1,
  "market_watcher.js": 3,
  "research_agent.js": 2,
  "risk_engine.js": 1,
  "social_agent.js": 1,
  "test_runner.js": 1,
  "trading_agent.js": 1,
  "x_agent.js": 1,
  "git_agent.js": 1,
  "research_router.js": 4
};

const used = agents.filter(a => activeRefs[a]);
const unused = agents.filter(a => !activeRefs[a]);

console.log('USED', used.length);
used.forEach(a => console.log(a, activeRefs[a]));

console.log('\nUNUSED', unused.length);
unused.forEach(a => console.log(a));
