#!/usr/bin/env python3
"""
Simplified X Daily Briefing Generator
Generates 3 posts/day for @quentinvest1
No rest days. No replies. Just content.
"""

import json
import random
from datetime import datetime
from pathlib import Path

class DailyBriefing:
    def __init__(self):
        self.workspace = Path("C:/Users/quent/.openclaw/workspace")
        self.output_dir = self.workspace / "daily_content"
        self.output_dir.mkdir(exist_ok=True)
        
        # Content templates by pillar
        self.templates = {
            "eth_treasury": {
                "single": [
                    "ETH treasuries are scaling fast. Bitmine now holds 5.74M ETH (4.8% of supply) worth $8.8B staked. $277M annual yield. The thesis is playing out in real-time.",
                    "While Bitcoin treasuries get the headlines, Ethereum treasuries earn yield. 3-4% APR changes the math for CFOs holding $100M+. Productive assets > idle stores of value.",
                    "One company now controls 4.8% of all ETH. Not speculation -- treasury management. The institutional adoption curve is steeper than most realize."
                ],
                "thread": [
                    "The Ethereum treasury thesis is accelerating faster than expected. Here's the latest data:\n\n1/ Bitmine: 5.74M ETH (4.8% of supply)\n2/ Staked value: $8.8B\n3/ Annual yield: $277M\n\nThis isn't crypto speculation. It's treasury management. Thread:",
                    "The yield matters. 3-4% staking APR on $100M = $3-4M annual income.\n\nETH treasuries:\n- Earn yield\n- Maintain upside exposure\n- DeFi integration\n\nBTC treasuries:\n- No yield\n- Store of value only",
                    "The MicroStrategy playbook evolved. First movers in ETH treasuries are building 8-figure annual income streams while holding the asset.\n\nThe next 12-18 months: Every CFO will evaluate this.",
                    "Infrastructure is ready:\n- ETH ETFs: Live\n- Institutional custody: Mature\n- Staking rewards: Reliable 3-4%\n- Regulatory clarity: Emerging\n\nThe pieces are falling into place.",
                    "I'm not selling my BTC. But if I were deploying $50M+ in treasury reserves today?\n\nETH gets serious consideration.\n\nYield + upside > upside alone.\n\nThat's the thesis."
                ]
            },
            "hims": {
                "single": [
                    "HIMS secured $400M from JPMorgan for working capital. Not M&A. Scaling operations. Stock +45% in 30 days. The market is waking up to healthcare infrastructure.",
                    "HIMS isn't a GLP-1 stock. It's healthcare infrastructure. $725M revenue, 2.6M subscribers, Novo Nordisk partnership. The picks and shovels play.",
                    "Telehealth + GLP-1s = infrastructure moment. HIMS owns the patient relationship, not the drug. That's the enduring value in healthcare delivery."
                ],
                "thread": [
                    "HIMS just hit a 2026 high. Up 45% in 30 days. But the real story isn't the stock price -- it's the infrastructure being built. Thread:",
                    "The $400M JPMorgan facility tells you everything:\n\nNot for acquisitions.\nNot for buybacks.\nFor WORKING CAPITAL.\n\nThey're scaling into demand that outpaces supply.",
                    "What HIMS actually is:\n- Telehealth infrastructure\n- Patient relationship platform\n- GLP-1 distribution rails\n- 2.6M subscribers\n- 65% gross margins\n\nNot a pharma company. An infrastructure company.",
                    "The Novo Nordisk partnership matters. Full FDA-approved lineup: Ozempic, Wegovy, Mounjaro, Zepbound.\n\nCash-pay starting at $149/month. As employers drop coverage, HIMS captures the overflow.",
                    "Analyst upgrades:\n- BofA: $37 target\n- Canaccord: $40 target\n\nThe narrative is shifting from 'telehealth app' to 'healthcare infrastructure.'\n\nThat's a multiple expansion story."
                ]
            },
            "ai_commerce": {
                "single": [
                    "McKinsey's 6-level automation curve for agentic commerce is here. We're at Level 1-2. Infrastructure build phase = investment phase.",
                    "Agentic commerce isn't coming. It's being built now. Linux Foundation Agentic AI Foundation with Anthropic, Google, Microsoft, OpenAI. The plumbing matters.",
                    "$3-5T agentic commerce by 2030. The winners won't be LLM makers. They'll be the intelligence layer owning customer relationships. NBIS. ZETA. PLTR."
                ],
                "thread": [
                    "McKinsey just published the 6-level automation curve for agentic commerce. Here's where we actually are in the $3-5T opportunity. Thread:",
                    "Level 1: Inspiration\nAI suggests products based on preferences\n\nLevel 2: Shortlisting\nAI narrows options\n\nLevel 3: Basket assembly\nAI builds cart from intent\n\nLevel 4: Negotiation\nAI compares prices across platforms\n\nLevel 5: Execution\nAI completes purchase\n\nLevel 6: Full delegation\nAI manages ongoing purchasing",
                    "Current state: Most consumers at Level 1-2.\n\nInfrastructure being built NOW:\n- MCP (Model Context Protocol)\n- A2A (Agent-to-Agent)\n- AP2/ACP (Agent Payments)\n- Visa/Mastercard agentic tools",
                    "The platform shift:\n\nWeb 1.0: Destination sites\nWeb 2.0: Aggregators (Amazon, Google)\nWeb 3.0: AI agents (intelligence layer)\n\nThe customer relationship moves from platform -> agent.",
                    "Investment implication:\n\nNot the LLM makers (OpenAI, Anthropic).\n\nThe intelligence companies that own customer relationships:\n- NBIS: AI-native commerce\n- ZETA: Customer intelligence\n- PLTR: Data infrastructure\n\nPicks and shovels > gold miners.\n\nTimeline: 2026-2027 infrastructure. 2028-2030 adoption.\n\nWe're early. That's the alpha."
                ]
            }
        }
    
    def generate_daily_content(self, date_str=None):
        """Generate 3 posts for the day"""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
        
        # Rotate pillars: ETH, HIMS, AI
        today = datetime.now().weekday()
        pillars = ["eth_treasury", "hims", "ai_commerce"]
        
        posts = []
        for i, pillar in enumerate(pillars):
            # Mix of singles and threads
            if pillar == "ai_commerce" and today % 3 == 0:
                post_type = "thread"
            elif pillar == "eth_treasury" and today % 2 == 0:
                post_type = "thread"
            else:
                post_type = "single"
            
            content = random.choice(self.templates[pillar][post_type])
            
            posts.append({
                "pillar": pillar,
                "type": post_type,
                "content": content,
                "time": ["11:00", "15:00", "19:00"][i]
            })
        
        return posts
    
    def format_briefing(self, posts, date_str=None):
        """Format posts into briefing"""
        if date_str is None:
            date_str = datetime.now().strftime("%A, %B %d, %Y")
        
        briefing = f"DAILY BRIEFING -- {date_str}\n\n=== TODAY'S 3 POSTS ===\n\n"
        
        for i, post in enumerate(posts, 1):
            pillar_names = {
                "eth_treasury": "ETH Treasury",
                "hims": "HIMS Healthcare", 
                "ai_commerce": "AI Agentic Commerce"
            }
            
            briefing += f"---\nPOST {i}/3 -- {pillar_names[post['pillar']]} ({post['time']})\nType: {post['type'].upper()}\n\n{post['content']}\n\n"
        
        briefing += "=== INSTRUCTIONS ===\n1. Copy Post 1 -> Paste to X -> POST NOW\n2. Schedule Post 2 for 3:00 PM Paris time\n3. Schedule Post 3 for 7:00 PM Paris time\n4. Reply: DONE when done\n\n---\nGenerated by Claw"
        
        return briefing
    
    def run(self, date_str=None):
        """Generate and save daily briefing"""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
        
        posts = self.generate_daily_content(date_str)
        briefing = self.format_briefing(posts, date_str)
        
        # Save to file
        output_file = self.output_dir / f"{date_str}_briefing.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(briefing)
        
        return briefing

if __name__ == "__main__":
    import sys
    
    briefing = DailyBriefing()
    
    if len(sys.argv) > 1 and sys.argv[1] == "today":
        result = briefing.run()
        print(result)
    else:
        result = briefing.run()
        print(result)
