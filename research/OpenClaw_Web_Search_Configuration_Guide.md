# OpenClaw Configuration Guide: Local Web Search & Data Automation

## Executive Summary
This document details two distinct methodologies for configuring OpenClaw with web search capabilities. The configuration fundamentally expands the agent's functionality, enabling live data retrieval for financial market analysis and local file processing. Both methods support advanced automation, such as establishing five-minute "heartbeat" intervals for continuous data scraping.

The two available configuration paths are:
1. **Cloud Search Integration (Brave API)**: Utilizes Brave's cloud infrastructure for rapid, lightweight web scraping.
2. **The 100% Local Route (Gemma 4 + SearXNG)**: A completely localized stack utilizing Google's Gemma 4 LLM and self-hosted search, ensuring zero data leakage for sensitive accounting workflows.

---

## Option 1: Cloud Search Integration (Brave API)

This method connects OpenClaw to the web using Brave's infrastructure. It is highly effective for automating financial research, such as monitoring public equities for options trading.

### Requirements
- Active internet connection.
- OpenClaw instance installed locally.
- Terminal access.

### Configuration Steps
1. **Create a Brave API Account**: Navigate to `api-dashboard.arch.brave.com`. Sign up and select the Free Plan. This tier provides **2,000 monthly search requests**. Note: Payment details are required for verification but are not charged for the free tier.
2. **Generate the Token**: In the API Keys section, click **Add API Key**. Name it (e.g., `OpenClaw_Search`) and copy the token.
3. **Initialize OpenClaw Configuration**: Run `openclaw config`.
4. **Configure Web Tools**:
   - Accept the local machine default for gateway location.
   - Select **Web Tools**.
   - Enable web search.
   - Select **Brave Search API**.
5. **Inject the API Key**: Paste the token when prompted.

---

## Option 2: The 100% Local Route (Gemma 4 + SearXNG)

This localized setup ensures strict data privacy by processing all requests on your hardware.

### Requirements
- Minimum **16GB RAM**.
- Ollama installed locally.
- Docker installed and running.

### Configuration Steps
1. **Download Gemma 4**: `ollama pull gemma4:latest`
2. **Connect Gemma 4 to OpenClaw**:
   - Run `openclaw configure`.
   - Go to **Model** → select **Ollama** → select **Gemma 4**.
   - Restart gateway: `openclaw gateway restart`
3. **Install SearXNG via Docker**:
   - Ensure Docker Desktop is running.
   - Run the SearXNG installation command from OpenClaw docs.
4. **Force JSON Formatting in SearXNG**:
   - Open Docker Desktop → SearXNG container → View Files.
   - Edit `etc/searxng/settings.yaml`.
   - Under `formats`, add `- JSON` on a new line.
   - Save and restart the SearXNG container.

---

## Feature Comparison

| Feature | Brave API | Gemma 4 + SearXNG |
|---|---|---|
| Privacy | External API | 100% Local |
| Cost | Free (2,000 req/mo) | Free, unlimited |
| Hardware | Low | High (16GB RAM) |
| Setup | Low | Moderate |
| Ideal Use | Market research | Sensitive workflows |

---

## Implementation Notes for Claw

- Brave API is the fastest path to live web search. Requires user to create an account and provide the API key.
- SearXNG route requires installing Docker Desktop + Ollama, pulling Gemma 4, and a system reboot to enable WSL2/Hyper-V.
- Once either source is available, update `project_claw_core/agents/research_router.js` to prioritize it.
