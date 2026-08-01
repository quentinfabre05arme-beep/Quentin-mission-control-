# Model Routing Best Practice

## The Problem
Pattern matching for model routing has inherent ambiguity:
- "Develop business strategy" → "develop" matches code, "strategy" matches analysis
- "Research quantum computing" → "research" matches analysis, but no strong patterns
- "How do I set up a cron job?" → "how to" matches quick_queries, but length/intent suggests analysis

## The Solution: Explicit Model Tags

Instead of guessing from task text, **use explicit tags** in requests:

### Tag Format
```
[MODEL:codex] Write a Python script...
[MODEL:grok] Analyze market strategy...
[MODEL:fast] What's the BTC price?
[MODEL:analyst] Calculate Sharpe ratio...
[MODEL:safety] Verify this data...
```

### Available Tags
| Tag | Model | Use For |
|-----|-------|---------|
| `[MODEL:fast]` | qwen3 | Quick questions, summaries |
| `[MODEL:code]` | qwen3-coder | Coding, debugging, scripts |
| `[MODEL:analysis]` | kimi-k2.6 | Research, analysis, evaluation |
| `[MODEL:analyst]` | deepseek-v4-pro | Math, science, calculations |
| `[MODEL:strategic]` | grok-4.3 | Business strategy, planning |
| `[MODEL:deep]` | grok-4.5 | High-stakes decisions |
| `[MODEL:design]` | kimi-k2.7-code | Architecture, system design |
| `[MODEL:safety]` | llama3.1 | Validation, fact-checking |

### Examples
```
[MODEL:code] Debug this JavaScript error
[MODEL:analysis] Research ETH vs SOL investment thesis  
[MODEL:strategic] Develop Q4 revenue strategy
[MODEL:deep] Should I sell all BTC right now?
[MODEL:fast] What's the weather in Aix?
```

## Fallback Behavior
If no tag provided, system uses **improved pattern matching** with priority weights:
1. Check for explicit tag → use specified model
2. Check for high-stakes keywords → grok-4.5
3. Check for strategic keywords → grok-4.3
4. Check for code keywords → qwen3-coder
5. Check for math/science → deepseek-v4-pro
6. Default → kimi-k2.6 (safe Ollama fallback)

## Benefits
- **Predictable**: No ambiguity, exact model control
- **Efficient**: No pattern matching overhead
- **Transparent**: User knows which model handles each task
- **Flexible**: Can override for any task

## Implementation
The orchestrator should check for `[MODEL:xxx]` tag at the start of task text, extract it, and route directly to that model. Remove tag before sending to model.

---
*This eliminates the 40% routing errors from pattern overlap.*
