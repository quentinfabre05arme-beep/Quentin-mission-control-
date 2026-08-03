#!/usr/bin/env python3
"""
Generate Daily Content using Grok X Research
Full working example with live X data
"""

import os
import json
import requests
from datetime import datetime
from typing import List, Dict

def call_grok(prompt: str, api_key: str, model: str = "grok-4.3", enable_search: bool = True) -> str:
    """Call xAI Responses API"""
    url = "https://api.x.ai/v1/responses"
    # Clean API key to handle any encoding issues
    clean_api_key = api_key.encode('utf-8').decode('utf-8')
    headers = {
        "Authorization": f"Bearer {clean_api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "input": [{"role": "user", "content": prompt}]
    }
    if enable_search:
        data["tools"] = [{"type": "web_search"}]
    
    response = requests.post(url, headers=headers, json=data, timeout=60)
    response.raise_for_status()
    result = response.json()
    
    if 'output_text' in result:
        return result['output_text']
    elif 'output' in result:
        for block in result['output']:
            if block.get('type') == 'message':
                content = block.get('content', [])
                if content:
                    return content[0].get('text', str(content))
    return str(result)


def research_pillar(pillar_name: str, keywords: List[str], api_key: str) -> Dict:
    """Research a content pillar using Grok"""
    
    query = ' OR '.join(keywords)
    
    # 1. Search X for recent posts
    search_prompt = f"""Search X (Twitter) for the most recent and relevant posts about: {query}

Find 5-8 high-quality posts from the last 24-48 hours. For each post, provide:
- Author (@username)
- Key insight or claim
- Any metrics/numbers mentioned
- Engagement sentiment (bullish/bearish/neutral)

Focus on posts with strong engagement or from notable accounts."""
    
    x_data = call_grok(search_prompt, api_key)
    
    # 2. Analyze trend
    trend_prompt = f"""Analyze the current X narrative about {pillar_name} based on this data:

{x_data[:1000]}

Provide:
1. Overall sentiment (bullish/bearish/neutral)
2. Key data points or metrics
3. Notable developments
4. Investment thesis strength (strong/moderate/weak)"""
    
    trend = call_grok(trend_prompt, api_key, enable_search=False)
    
    # 3. Generate post options
    post_prompt = f"""Create 3 high-engagement X post options for @quentinvest1 about {pillar_name}.

X Research Data:
{x_data[:1500]}

Trend Analysis:
{trend[:800]}

For each post:
1. HOOK (first line that stops scrolling - max 10 words)
2. BODY (2-4 sentences, data-backed, thesis-driven)
3. FORMAT (SINGLE or THREAD)
4. BEST_TIME (11am, 3pm, or 7pm Paris time)
5. ENGAGEMENT_SCORE (1-10 based on data strength)
6. REPLY_HOOK (question or statement to drive replies)

Style: Authentic, conviction-driven, infrastructure narrative. No emojis unless minimal."""
    
    posts = call_grok(post_prompt, api_key, enable_search=False)
    
    return {
        "pillar": pillar_name,
        "x_research": x_data,
        "trend_analysis": trend,
        "post_options": posts,
        "timestamp": datetime.now().isoformat()
    }


def generate_daily_briefing():
    """Generate complete daily content briefing"""
    
    api_key = os.getenv('XAI_API_KEY')
    if not api_key:
        print("ERROR: Set XAI_API_KEY environment variable")
        return
    
    print("=" * 70)
    print("DAILY CONTENT BRIEFING - GROK X RESEARCH")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} Paris Time")
    print("=" * 70)
    
    # Define pillars
    pillars = [
        ("ETH Treasury", ["ETH", "Ethereum", "Bitmine", "ETH treasury", "staking yield", "5.74M ETH"]),
        ("HIMS Healthcare", ["HIMS", "Hims & Hers", "GLP-1", "telehealth", "semaglutide", "@wearehims"]),
        ("AI Agentic Commerce", ["AI agents", "MCP protocol", "A2A protocol", "agentic commerce", "autonomous agents"])
    ]
    
    all_results = {}
    
    for pillar_name, keywords in pillars:
        print(f"\n{'='*70}")
        print(f"RESEARCHING: {pillar_name.upper()}")
        print("=" * 70)
        
        result = research_pillar(pillar_name, keywords, api_key)
        all_results[pillar_name] = result
        
        print(f"\n📊 X RESEARCH FINDINGS:")
        print("-" * 70)
        print(result["x_research"][:1000])
        if len(result["x_research"]) > 1000:
            print("... [truncated]")
        
        print(f"\n📈 TREND ANALYSIS:")
        print("-" * 70)
        print(result["trend_analysis"][:800])
        if len(result["trend_analysis"]) > 800:
            print("... [truncated]")
        
        print(f"\n📝 POST OPTIONS:")
        print("-" * 70)
        print(result["post_options"])
        print()
    
    # Save full results
    os.makedirs('operations/research', exist_ok=True)
    os.makedirs('daily_content', exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d')
    
    # Save full research
    with open(f'operations/research/grok_research_{timestamp}.json', 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    # Create briefing text
    briefing = create_briefing_text(all_results, timestamp)
    
    with open(f'daily_content/{timestamp}_briefing_grok.txt', 'w', encoding='utf-8') as f:
        f.write(briefing)
    
    print("\n" + "=" * 70)
    print("FILES SAVED:")
    print(f"  - operations/research/grok_research_{timestamp}.json")
    print(f"  - daily_content/{timestamp}_briefing_grok.txt")
    print("=" * 70)


def create_briefing_text(results: Dict, timestamp: str) -> str:
    """Create formatted briefing text"""
    
    lines = [
        "=" * 70,
        "DAILY CONTENT BRIEFING - X RESEARCH",
        f"Date: {timestamp}",
        f"Generated: {datetime.now().strftime('%H:%M')} Paris Time",
        "=" * 70,
        "",
        "🎯 TODAY'S CONTENT PILLARS:",
        "",
    ]
    
    schedule = [
        ("11:00 AM", "ETH Treasury"),
        ("15:00", "HIMS Healthcare"),
        ("19:00", "AI Agentic Commerce")
    ]
    
    for time_slot, pillar_name in schedule:
        data = results.get(pillar_name, {})
        
        lines.extend([
            f"\n{'='*70}",
            f"📍 {time_slot} - {pillar_name.upper()}",
            "=" * 70,
            "",
            "X RESEARCH SUMMARY:",
            data.get("trend_analysis", "N/A")[:500],
            "",
            "POST OPTIONS:",
            data.get("post_options", "N/A"),
            "",
        ])
    
    lines.extend([
        "=" * 70,
        "POSTING CHECKLIST:",
        "=" * 70,
        "",
        "[ ] 11:00 AM - ETH Treasury post",
        "[ ] 15:00 - HIMS Healthcare post",
        "[ ] 19:00 - AI Agentic Commerce post",
        "",
        "ENGAGEMENT REMINDERS:",
        "- Reply to comments within 30 min (13.5x weight)",
        "- Use reply hooks to drive conversation",
        "- Quote tweet with additional insight if post performs well",
        "",
        "=" * 70,
    ])
    
    return "\n".join(lines)


if __name__ == '__main__':
    generate_daily_briefing()
