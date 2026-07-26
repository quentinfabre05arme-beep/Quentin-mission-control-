/**
 * Intent-Based Agent Creation
 * Create agents from natural language descriptions
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', '..', 'generated_agents');

class IntentParser {
  constructor() {
    this.patterns = {
      triggers: [
        { regex: /when\s+(.+?)\s+(?:is|hits|reaches|goes|drops|rises|moves)/i, type: 'threshold' },
        { regex: /every\s+(.+?)(?:\s+at\s+(.+))?/i, type: 'schedule' },
        { regex: /if\s+(.+?)\s+then/i, type: 'conditional' },
        { regex: /alert\s+me\s+when/i, type: 'alert' }
      ],
      actions: [
        { regex: /alert\s+me/i, action: 'alert' },
        { regex: /email\s+me/i, action: 'email' },
        { regex: /log\s+it/i, action: 'log' },
        { regex: /create\s+(?:a\s+)?(.+)/i, action: 'create' },
        { regex: /send\s+(.+)/i, action: 'send' }
      ],
      assets: [
        { regex: /\b(BTC|ETH|bitcoin|ethereum)\b/i, type: 'crypto' },
        { regex: /\b(MSTR|HIMS|AAPL|COIN)\b/i, type: 'stock' },
        { regex: /\b(portfolio|watchlist|everything)\b/i, type: 'collection' }
      ],
      thresholds: [
        { regex: /(\d+(?:\.\d+)?)\s*%/i, type: 'percentage' },
        { regex: /\$(\d+(?:,\d{3})*(?:\.\d+)?)/i, type: 'price' },
        { regex: /(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i, type: 'price' }
      ]
    };
  }

  /**
   * Parse natural language into structured intent
   */
  parse(input) {
    const intent = {
      raw: input,
      type: 'unknown',
      trigger: null,
      condition: null,
      action: null,
      target: null,
      threshold: null,
      frequency: null,
      confidence: 0
    };

    // Extract trigger
    for (const pattern of this.patterns.triggers) {
      const match = input.match(pattern.regex);
      if (match) {
        intent.trigger = {
          type: pattern.type,
          value: match[1]
        };
        break;
      }
    }

    // Extract action
    for (const pattern of this.patterns.actions) {
      const match = input.match(pattern.regex);
      if (match) {
        intent.action = {
          type: pattern.action,
          value: match[1] || 'default'
        };
        break;
      }
    }

    // Extract target/asset
    for (const pattern of this.patterns.assets) {
      const match = input.match(pattern.regex);
      if (match) {
        intent.target = {
          type: pattern.type,
          value: match[0].toUpperCase()
        };
        break;
      }
    }

    // Extract threshold
    for (const pattern of this.patterns.thresholds) {
      const match = input.match(pattern.regex);
      if (match) {
        intent.threshold = {
          type: pattern.type,
          value: parseFloat(match[1].replace(',', ''))
        };
        break;
      }
    }

    // Calculate confidence
    intent.confidence = this.calculateConfidence(intent);

    // Determine intent type
    intent.type = this.determineType(intent);

    return intent;
  }

  calculateConfidence(intent) {
    let score = 0;
    if (intent.trigger) score += 0.3;
    if (intent.action) score += 0.3;
    if (intent.target) score += 0.2;
    if (intent.threshold) score += 0.2;
    return score;
  }

  determineType(intent) {
    if (intent.trigger?.type === 'threshold' && intent.action?.type === 'alert') {
      return 'price_alert';
    }
    if (intent.trigger?.type === 'schedule' && intent.action?.type === 'create') {
      return 'scheduled_creation';
    }
    if (intent.trigger?.type === 'conditional') {
      return 'conditional_logic';
    }
    return 'simple_alert';
  }
}

class AgentBuilder {
  constructor() {
    this.parser = new IntentParser();
  }

  /**
   * Create agent from intent
   */
  create(intent) {
    const agent = {
      name: this.generateName(intent),
      description: intent.raw,
      version: '1.0',
      created: new Date().toISOString(),
      components: []
    };

    // Add trigger component
    if (intent.trigger) {
      agent.components.push(this.buildTrigger(intent));
    }

    // Add action component
    if (intent.action) {
      agent.components.push(this.buildAction(intent));
    }

    // Add logging
    agent.components.push({
      type: 'log',
      config: {
        file: `logs/${agent.name}.log`,
        level: 'info'
      }
    });

    return agent;
  }

  generateName(intent) {
    const parts = [];
    if (intent.target) parts.push(intent.target.value.toLowerCase());
    if (intent.action) parts.push(intent.action.type);
    if (intent.trigger) parts.push(intent.trigger.type);
    
    const name = parts.join('-') || 'custom-agent';
    return name + '-' + Date.now().toString().slice(-4);
  }

  buildTrigger(intent) {
    const trigger = {
      type: 'trigger',
      config: {}
    };

    switch (intent.trigger.type) {
      case 'threshold':
        trigger.config = {
          type: 'threshold',
          asset: intent.target?.value,
          threshold: intent.threshold?.value,
          condition: intent.raw.includes('drops') ? 'below' : 'above'
        };
        break;
      case 'schedule':
        trigger.config = {
          type: 'cron',
          expression: this.parseSchedule(intent.trigger.value)
        };
        break;
      default:
        trigger.config = {
          type: 'manual'
        };
    }

    return trigger;
  }

  buildAction(intent) {
    const action = {
      type: 'action',
      config: {}
    };

    switch (intent.action.type) {
      case 'alert':
        action.config = {
          type: 'notification',
          channel: 'telegram',
          message: `Alert: ${intent.target?.value} ${intent.condition || 'triggered'}`
        };
        break;
      case 'email':
        action.config = {
          type: 'email',
          subject: `Agent Alert: ${intent.target?.value}`,
          body: `Generated by agent at ${new Date().toISOString()}`
        };
        break;
      case 'log':
        action.config = {
          type: 'log',
          level: 'info'
        };
        break;
      default:
        action.config = {
          type: 'custom',
          action: intent.action.type
        };
    }

    return action;
  }

  parseSchedule(scheduleText) {
    // Simple schedule parsing
    if (scheduleText.includes('hour')) return '0 * * * *';
    if (scheduleText.includes('day')) return '0 9 * * *';
    if (scheduleText.includes('week')) return '0 9 * * 1';
    return '0 */6 * * *'; // Default: every 6 hours
  }
}

class AgentDeployer {
  constructor() {
    this.agents = [];
  }

  /**
   * Deploy agent to runtime
   */
  deploy(agent) {
    if (!fs.existsSync(AGENTS_DIR)) {
      fs.mkdirSync(AGENTS_DIR, { recursive: true });
    }

    const agentPath = path.join(AGENTS_DIR, `${agent.name}.json`);
    fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2));

    this.agents.push(agent);

    return {
      status: 'deployed',
      name: agent.name,
      path: agentPath,
      components: agent.components.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * List all deployed agents
   */
  listAgents() {
    return this.agents;
  }

  /**
   * Get agent by name
   */
  getAgent(name) {
    return this.agents.find(a => a.name === name);
  }
}

// Main interface
class IntentBasedCreation {
  constructor() {
    this.parser = new IntentParser();
    this.builder = new AgentBuilder();
    this.deployer = new AgentDeployer();
  }

  /**
   * Create agent from natural language
   */
  async createFromIntent(description) {
    console.log(`🎯 Parsing intent: "${description}"`);

    // Step 1: Parse
    const intent = this.parser.parse(description);
    console.log(`📋 Intent parsed (confidence: ${(intent.confidence * 100).toFixed(0)}%)`);

    // Step 2: Build
    const agent = this.builder.create(intent);
    console.log(`🔧 Agent built: ${agent.name}`);

    // Step 3: Deploy
    const deployed = this.deployer.deploy(agent);
    console.log(`🚀 Agent deployed: ${deployed.name}`);

    return {
      intent,
      agent,
      deployed,
      summary: this.generateSummary(intent, agent)
    };
  }

  generateSummary(intent, agent) {
    return `✅ Created agent "${agent.name}"
   Trigger: ${intent.trigger?.type || 'manual'} (${intent.trigger?.value || 'N/A'})
   Action: ${intent.action?.type || 'log'}
   Target: ${intent.target?.value || 'none'}
   Confidence: ${(intent.confidence * 100).toFixed(0)}%
   Components: ${agent.components.length}`;
  }
}

module.exports = { IntentBasedCreation, IntentParser, AgentBuilder, AgentDeployer };
