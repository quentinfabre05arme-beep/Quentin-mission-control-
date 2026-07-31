---
name: grok-browser-chat
description: Advanced browser automation to talk with Grok (including DeepSearch). Uses the user's logged-in Chrome session. Prefer this when the user wants to ask Grok something without using the official API.
version: 2.0.0
metadata:
  openclaw:
    emoji: "🤖"
    requires:
      tools: ["browser"]
    tags: ["grok", "xai", "browser", "chat", "deepsearch"]
---

# Grok Browser Chat (Advanced v2.0)

Talk to Grok through the user's real Chrome browser (must already be logged in).

## Core Rules
- Always use `profile=chrome`
- Never use the isolated `openclaw` profile (it won't be logged in)
- Grok input is a **contenteditable** → always use `evaluate`, never normal `type`
- Prefer extracting the answer via the "Copy" button

---

## Full Workflow

### 1. Locate or open Grok tab
```
browser action=tabs profile=chrome
```
Look for a tab containing `grok.com` or `x.com/i/grok`. Save the `targetId`.
If no Grok tab is open:
```
browser action=open profile=chrome url="https://grok.com"
```
Wait 3 seconds, then list tabs again.

### 2. (Optional) Enable DeepSearch
Only if the user asks for DeepSearch / deeper research / "search the web thoroughly":
1. Take an interactive snapshot
2. Find the DeepSearch / Think / Research button
3. Click it before typing the question
```
browser action=snapshot profile=chrome targetId=<TARGET_ID> --interactive
# then click the DeepSearch ref
browser action=act profile=chrome targetId=<TARGET_ID> request={"kind":"click","ref":"<DEEPSEARCH_REF>"}
```

### 3. Type the question
```
browser action=act profile=chrome targetId=<TARGET_ID> request={
  "kind": "evaluate",
  "fn": "(() => { const e = document.querySelector('[contenteditable=\"true\"]'); if (e) { e.focus(); e.innerText = `QUESTION_HERE`; return 'ok'; } return 'not found'; })()"
}
```
Replace `QUESTION_HERE` with the actual user question (keep backticks for multi-line support).

### 4. Submit
```
browser action=act profile=chrome targetId=<TARGET_ID> request={"kind":"press","key":"Enter"}
```

### 5. Wait until Grok finishes (smart detection)
Use multiple signals. Try them in order:

**Preferred:**
```
browser action=wait profile=chrome targetId=<TARGET_ID> request={"kind":"wait","text":"Copy","timeoutMs":90000}
```

**Fallbacks (if the above fails):**
```
# Wait for follow-up suggestions or response time indicator
browser action=wait profile=chrome targetId=<TARGET_ID> request={"kind":"wait","text":"ms","timeoutMs":60000}
```
Or simply:
```
# Conservative fixed wait (adjust based on complexity)
sleep 18
```
For DeepSearch questions, increase the wait significantly (45–90 seconds).

### 6. Extract the clean answer

**Best method – click Copy button:**
1. Snapshot:
```
browser action=snapshot profile=chrome targetId=<TARGET_ID> --interactive
```
2. Find the **Copy** button that belongs to the **latest** Grok response (usually the last one).
3. Click it:
```
browser action=act profile=chrome targetId=<TARGET_ID> request={"kind":"click","ref":"<COPY_REF>"}
```
4. Read clipboard:
```
pbpaste
```
Return the clean text to the user.

**Fallback method:**
- Take a full screenshot
- Use a vision-capable model to read Grok's answer

### 7. Start a new conversation (when needed)
```
browser action=navigate profile=chrome targetId=<TARGET_ID> targetUrl="https://grok.com"
```
Or use keyboard shortcut:
```
browser action=act profile=chrome targetId=<TARGET_ID> request={"kind":"press","key":"Meta+j"}
```

---

## Extra Features

### Detect if logged out
If the page shows a login button or "Sign in to continue", stop and tell the user:
"You need to log in to Grok in Chrome first."

### Detect if DeepSearch is active
After clicking DeepSearch, wait for the search animation to complete before typing.
Look for phrases like "Searching...", "Researching...", or a loading spinner.

### Handle long responses
For very long responses, Grok may show "Continue" or "Show more" buttons.
Click them if present to get the full answer.

### Error recovery
- If contenteditable not found → refresh page and retry
- If Copy button not found → use screenshot fallback
- If timeout → increase wait time and retry
- If page reloads → re-discover targetId

---

## Usage Examples
- "Ask Grok what he thinks about AI agents"
- "Ask Grok to DeepSearch the best local LLMs"
- "Ask Grok about [topic] with DeepSearch"
- "Use Grok to research [topic]"
