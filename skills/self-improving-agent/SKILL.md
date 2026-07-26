# 🧠 Self-Improving Agent

**Description:** Auto-optimize based on user feedback and performance metrics.

## How It Works

### 1. Feedback Collection
```
User: "That was too verbose" → Record: verbosity -= 1
User: "Perfect!" → Record: pattern += 1
User: "Wrong data" → Record: accuracy -= 1
```

### 2. Pattern Detection
```
Analyze 100 interactions:
- 80% want concise → Default to brief
- 60% ask BTC at 9am → Pre-fetch at 8:55
- 40% follow research with action → Auto-suggest
```

### 3. Auto-Optimization
```
Before: Always verbose explanations
After: Brief by default, expand on request

Before: Generic research
After: Personalized to user's interests

Before: Reactive
After: Proactive based on patterns
```

## Features

### Performance Tracking
- Success rate per skill
- Token efficiency
- User satisfaction score
- Error frequency

### Auto-Adjustment
- Compress if verbosity > threshold
- Expand if user asks "explain more"
- Pre-load if time pattern detected
- Alert if error rate spikes

### Learning Loops
```
Detect → Analyze → Adjust → Verify
```

## Safety
- Log all changes
- Revert if satisfaction drops
- Ask before major changes
- Gradual adjustments only
