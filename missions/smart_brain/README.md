# 🧠 Multi-Model "Smartest Brain" Architecture v2.0

## Overview

Autonomous multi-model orchestration that routes tasks to the best AI model based on task type, complexity, and requirements. **Now with real model switching support.**

## Available Models

| Model | Role | Strengths | Cost | Speed |
|-------|------|-----------|------|-------|
| **kimi-k2.6** | Orchestrator | Complex reasoning, planning | High | Medium |
| **qwen3-coder** | Implementer | Code generation, debugging | Medium | Fast |
| **qwen3** | Quick Responder | Speed, summarization | Low | Very Fast |
| **deepseek-v4-pro** | Analyst | Deep reasoning, mathematics | High | Slow |
| **kimi-k2.7-code** | Advanced Coder | Algorithms, system design | Very High | Medium |
| **llama3.1** | Validator | Safety, fact-checking | Low | Fast |

## Architecture

```
┌─────────────────────────────────────────┐
│           TASK INPUT                    │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     Task Analyzer (SmartBrain)          │
│  - Pattern matching on task text        │
│  - Complexity scoring (1-10)            │
│  - Confidence calculation               │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Model Router + Cost Optimizer      │
│  - Code tasks → qwen3-coder             │
│  - Quick queries → qwen3              │
│  - Complex analysis → deepseek-v4     │
│  - System design → kimi-k2.7-code     │
│  - Scientific → deepseek-v4             │
│  - Validation → llama3.1               │
│  - Fallback → kimi-k2.6                 │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Model Switcher (Real-time)         │
│  - Saves session state                  │
│  - Transfers context                    │
│  - Tracks switch history                │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Selected Model Execution           │
│  - Runs task with optimal model         │
│  - Returns results                      │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Validation (llama3.1)             │
│  - Fact-checks results                  │
│  - Validates safety                     │
│  - Fallback if needed                   │
└─────────────────────────────────────────┘
```

## Execution Modes

### 1. Single Model
Use one model for the entire task.
```javascript
const result = brain.executeTask("Write a Python script");
// → qwen3-coder
```

### 2. Sequential
Chain models: one does the work, next validates.
```javascript
const result = brain.executeTask("Analyze portfolio", { mode: 'sequential' });
// → deepseek-v4-pro + llama3.1 validation
```

### 3. Parallel
Multiple models work simultaneously.
```javascript
const result = brain.executeParallel("Research topic", [
    'ollama-cloud/deepseek-v4-pro',
    'ollama-cloud/kimi-k2.6'
]);
```

### 4. Adaptive
Start with cheaper model, escalate if needed.
```javascript
const result = brain.executeAdaptive("Unknown task");
// → Tries: qwen3 → qwen3-coder → kimi-k2.6 → deepseek-v4
```

## Files

| File | Purpose |
|------|---------|
| `config.json` | Model definitions and routing rules |
| `orchestrator.js` | Main orchestration engine |
| `model_switcher.js` | Real-time model switching |
| `README.md` | This file |

## Usage

### Basic Routing
```javascript
const SmartBrain = require('./orchestrator');
const brain = new SmartBrain();

// Automatically routes to best model
const result = brain.executeTask("Write a Python script to fetch Bitcoin prices");
// → Routes to qwen3-coder

const result2 = brain.executeTask("Calculate Sharpe ratio");
// → Routes to deepseek-v4-pro
```

### Model Switching
```javascript
const ModelSwitcher = require('./model_switcher');
const switcher = new ModelSwitcher();

// Switch based on task
await switcher.switchForTask("Debug this code");
// → Switches to qwen3-coder

// Direct switch
await switcher.switchToModel('ollama-cloud/kimi-k2.6');
```

### Get Recommendations
```javascript
const recs = brain.getRecommendations("Build a trading bot");
// Returns: [{ role: 'primary', model: 'qwen3-coder', ... }, ...]
```

## Routing Examples

| Task | Routed To | Confidence |
|------|-----------|------------|
| "Write Python script..." | **qwen3-coder** | 100% |
| "Debug JavaScript error..." | **qwen3-coder** | 100% |
| "Design microservices..." | **kimi-k2.7-code** | 100% |
| "Calculate Sharpe ratio..." | **deepseek-v4-pro** | 50% → fallback |
| "What's the weather?" | **qwen3** | 30% → fallback |
| "Analyze GLP-1 impact..." | **deepseek-v4-pro** | 50% → fallback |

## Cost Optimization

The system automatically falls back to cheaper models when confidence is low:
- Confidence < 70%: Use fallback model
- Confidence < 50%: Use cheapest viable model
- This saves tokens on ambiguous tasks

## Integration with OpenClaw

To integrate with OpenClaw's actual model switching:

```javascript
// In your OpenClaw skill or agent:
const { ModelSwitcher } = require('./missions/smart_brain/model_switcher');

// Before executing a task:
const switcher = new ModelSwitcher();
const { currentModel } = await switcher.switchForTask(userInput);

// Use the returned model ID with OpenClaw's model parameter
// This requires OpenClaw API support for dynamic model selection
```

## Performance Stats

The system tracks:
- Task → Model assignments
- Confidence scores
- Execution modes used
- Estimated costs
- Switch history

Access via: `brain.getStats()`

## Future Enhancements

- [ ] Direct OpenClaw API integration for real model switching
- [ ] Cost tracking and budget management
- [ ] Automatic model performance benchmarking
- [ ] Self-learning routing improvements
- [ ] Parallel execution with result aggregation
- [ ] A/B testing between models

---

**Status:** ✅ OPERATIONAL v2.0  
**Created:** July 25, 2026  
**Models:** 6 active | **Routing Rules:** 6 categories | **Execution Modes:** 4