const { ResearchAgent } = require('./project_claw_core/agents/research_agent');
(async () => {
  const agent = new ResearchAgent();
  const results = await agent.research('bitcoin price today', 3);
  console.log(JSON.stringify(results, null, 2));
})();
