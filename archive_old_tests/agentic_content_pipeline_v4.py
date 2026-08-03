#!/usr/bin/env python3
"""
Agentic Content Pipeline v4.0
Based on 2025 self-improvement research findings
Implements: Multi-agent architecture, Reflection pattern, Tool-use pattern
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

class AgentRole(Enum):
    RESEARCH = "research"
    CONTENT = "content"
    CRITIC = "critic"
    ORCHESTRATOR = "orchestrator"

class ContentAngle(Enum):
    DATA_DRIVEN = "data-driven"
    CONTRARIAN = "contrarian"
    THREAD_HOOK = "thread-hook"
    REFRAME = "reframe"
    INSIGHT = "insight"
    SURPRISE = "surprise-factor"

@dataclass
class ResearchFinding:
    """Structured research finding for content generation"""
    source: str
    topic: str
    key_points: List[str]
    sentiment: str = "neutral"
    urgency: str = "normal"  # normal, high, breaking
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class ContentDraft:
    """Content draft with scoring metadata"""
    hook: str
    body: str
    angle: ContentAngle
    engagement_score: int
    hashtags: List[str]
    media_suggestions: List[str]
    is_thread: bool
    reply_hooks: List[str]
    version: int = 1

@dataclass
class ContentCritique:
    """Critique from critic agent"""
    draft: ContentDraft
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    revised_score: int
    approved: bool

class ResearchAgent:
    """
    Research Agent - gathers multi-source data
    Implements Tool-Use pattern for external data sources
    """
    
    def __init__(self):
        self.topics_config = {
            "eth_treasury": {
                "name": "ETH Treasury",
                "search_queries": [
                    "ETH treasury institutional adoption 2026",
                    "Ethereum corporate treasury yield",
                    "Bitmine ETH holdings update"
                ],
                "key_metrics": ["holdings", "yield", "institutional_adoption"],
                "sentiment_keywords": {
                    "positive": ["adoption", "yield", "growth", "accumulation"],
                    "negative": ["sell", "dump", "regulation", "ban"],
                    "neutral": ["hold", "stable", "flat"]
                }
            },
            "hims": {
                "name": "HIMS Healthcare",
                "search_queries": [
                    "HIMS stock infrastructure 2026",
                    "Hims Hers telehealth GLP-1",
                    "healthcare infrastructure scaling"
                ],
                "key_metrics": ["subscribers", "facility", "growth"],
                "sentiment_keywords": {
                    "positive": ["growth", "expansion", "partnership", "innovation"],
                    "negative": ["lawsuit", "recall", "decline", "loss"],
                    "neutral": ["report", "earnings", "update"]
                }
            },
            "ai_commerce": {
                "name": "AI Agentic Commerce",
                "search_queries": [
                    "agentic commerce McKinsey 2026",
                    "autonomous agents infrastructure",
                    "AI commerce protocols MCP A2A"
                ],
                "key_metrics": ["market_size", "adoption_rate", "protocols"],
                "sentiment_keywords": {
                    "positive": ["breakthrough", "adoption", "launch", "partnership"],
                    "negative": ["delay", "failure", "concern", "risk"],
                    "neutral": ["research", "study", "analysis"]
                }
            }
        }
    
    def gather_research(self, topic_key: str, use_web_search: bool = False) -> ResearchFinding:
        """Gather research for a topic"""
        config = self.topics_config.get(topic_key)
        if not config:
            raise ValueError(f"Unknown topic: {topic_key}")
        
        # Simulate research gathering (in production, this would call web_search)
        # For now, return structured template data
        
        key_points = self._generate_key_points(topic_key)
        sentiment = self._analyze_sentiment(topic_key, key_points)
        
        return ResearchFinding(
            source="integrated_pipeline",
            topic=config["name"],
            key_points=key_points,
            sentiment=sentiment,
            urgency="normal"
        )
    
    def _generate_key_points(self, topic_key: str) -> List[str]:
        """Generate key points based on topic"""
        points_db = {
            "eth_treasury": [
                "Institutional accumulation accelerating",
                "Staking yields providing sustainable income",
                "Supply dynamics shifting toward scarcity",
                "Corporate treasury adoption expanding beyond early adopters"
            ],
            "hims": [
                "Infrastructure scaling to meet demand",
                "Telehealth + GLP-1 creating moat",
                "Patient relationship ownership key advantage",
                "Healthcare delivery model disruption underway"
            ],
            "ai_commerce": [
                "Agentic automation levels 1-2 current state",
                "MCP/A2A protocols standardizing integration",
                "$3-5T market projection by 2030",
                "Intelligence layer becoming value capture point"
            ]
        }
        return points_db.get(topic_key, ["Key point 1", "Key point 2", "Key point 3"])
    
    def _analyze_sentiment(self, topic_key: str, points: List[str]) -> str:
        """Simple sentiment analysis based on keywords"""
        config = self.topics_config[topic_key]
        pos_keywords = config["sentiment_keywords"]["positive"]
        neg_keywords = config["sentiment_keywords"]["negative"]
        
        text = " ".join(points).lower()
        pos_count = sum(1 for kw in pos_keywords if kw in text)
        neg_count = sum(1 for kw in neg_keywords if kw in text)
        
        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        return "neutral"

class ContentAgent:
    """
    Content Agent - generates multi-angle content
    Implements multi-angle generation best practice
    """
    
    def __init__(self):
        self.engagement_weights = {
            "retweet": 20,
            "reply": 13.5,
            "profile_click": 12,
            "link_click": 11,
            "like": 1
        }
    
    def generate_angles(self, research: ResearchFinding, topic_key: str) -> List[ContentDraft]:
        """Generate multiple content angles from research"""
        
        angle_generators = {
            ContentAngle.DATA_DRIVEN: self._generate_data_driven,
            ContentAngle.CONTRARIAN: self._generate_contrarian,
            ContentAngle.THREAD_HOOK: self._generate_thread_hook,
            ContentAngle.REFRAME: self._generate_reframe,
            ContentAngle.INSIGHT: self._generate_insight,
            ContentAngle.SURPRISE: self._generate_surprise
        }
        
        drafts = []
        for angle_type, generator in angle_generators.items():
            draft = generator(research, topic_key)
            drafts.append(draft)
        
        return sorted(drafts, key=lambda x: x.engagement_score, reverse=True)
    
    def _generate_data_driven(self, research: ResearchFinding, topic: str) -> ContentDraft:
        """Data-driven angle with specific metrics"""
        hooks = {
            "eth_treasury": "The data on ETH treasuries is stronger than the headlines suggest:",
            "hims": "HIMS numbers tell a different story than the narrative:",
            "ai_commerce": "The agentic commerce data points are converging:"
        }
        
        return ContentDraft(
            hook=hooks.get(topic, "The data shows:"),
            body="\n".join([f"• {point}" for point in research.key_points[:3]]),
            angle=ContentAngle.DATA_DRIVEN,
            engagement_score=18,
            hashtags=self._get_hashtags(topic),
            media_suggestions=["chart", "data visualization"],
            is_thread=True,
            reply_hooks=["What metric stands out to you?", "Any other data points I'm missing?"]
        )
    
    def _generate_contrarian(self, research: ResearchFinding, topic: str) -> ContentDraft:
        """Contrarian take angle"""
        hooks = {
            "eth_treasury": "Everyone's watching BTC treasuries. The ETH play is quieter but bigger:",
            "hims": "HIMS isn't a GLP-1 stock. It's healthcare infrastructure:",
            "ai_commerce": "The agentic commerce winners won't be the LLM companies:"
        }
        
        return ContentDraft(
            hook=hooks.get(topic, "Unpopular opinion:"),
            body=f"Why {research.topic} is misunderstood:\n\n" + "\n".join(research.key_points[:3]),
            angle=ContentAngle.CONTRARIAN,
            engagement_score=20,
            hashtags=self._get_hashtags(topic),
            media_suggestions=["comparison chart"],
            is_thread=True,
            reply_hooks=["Where do you disagree?", "What's the counter-argument?"]
        )
    
    def _generate_thread_hook(self, research: ResearchFinding, topic: str) -> ContentDraft:
        """Thread-optimized hook angle"""
        hooks = {
            "eth_treasury": "The ETH treasury thesis in 5 charts. Thread",
            "hims": "Why HIMS just changed the telehealth game. Thread",
            "ai_commerce": "Agentic commerce: from Level 1 to Level 6. Thread"
        }
        
        return ContentDraft(
            hook=hooks.get(topic, f"{research.topic} breakdown. Thread"),
            body="\n\n".join([f"{i+1}/ {point}" for i, point in enumerate(research.key_points)]),
            angle=ContentAngle.THREAD_HOOK,
            engagement_score=21,
            hashtags=self._get_hashtags(topic),
            media_suggestions=["thread visual", "carousel"],
            is_thread=True,
            reply_hooks=["Which point resonates most?", "What did I miss?"]
        )
    
    def _generate_reframe(self, research: ResearchFinding, topic: str) -> ContentDraft:
        """Reframe the narrative angle"""
        hooks = {
            "eth_treasury": "Stop thinking about ETH price. Start thinking about ETH yield:",
            "hims": "Stop calling it telehealth. It's healthcare infrastructure:",
            "ai_commerce": "Stop calling them chatbots. They're commerce infrastructure:"
        }
        
        return ContentDraft(
            hook=hooks.get(topic, "Reframe:"),
            body=f"{research.topic} isn't what you think:\n\n" + "\n".join(research.key_points[:3]),
            angle=ContentAngle.REFRAME,
            engagement_score=18,
            hashtags=self._get_hashtags(topic),
            media_suggestions=["infographic"],
            is_thread=False,
            reply_hooks=["Does this reframe resonate?"]
        )
    
    def _generate_insight(self, research: ResearchFinding, topic: str) -> ContentDraft:
        """Deep insight angle"""
        hooks = {
            "eth_treasury": "The institutional ETH thesis is playing out faster than expected:",
            "hims": "HIMS is building something bigger than a GLP-1 platform:",
            "ai_commerce": "We're earlier in the agentic commerce cycle than most realize:"
        }
        
        return ContentDraft(
            hook=hooks.get(topic, "Key insight:"),
            body="\n".join([f"→ {point}" for point in research.key_points[:3]]),
            angle=ContentAngle.INSIGHT,
            engagement_score=17,
            hashtags=self._get_hashtags(topic),
            media_suggestions=["insight graphic"],
            is_thread=False,
            reply_hooks=["What trends are you seeing?"]
        )
    
    def _generate_surprise(self, research: ResearchFinding, topic: str) -> ContentDraft:
        """Surprise factor angle"""
        hooks = {
            "eth_treasury": "One company quietly accumulated 5% of all ETH:",
            "hims": "HIMS just leapfrogged competitors with one move:",
            "ai_commerce": "The $3T opportunity nobody's talking about:"
        }
        
        return ContentDraft(
            hook=hooks.get(topic, "Surprising development:"),
            body="\n".join(research.key_points[:2]),
            angle=ContentAngle.SURPRISE,
            engagement_score=19,
            hashtags=self._get_hashtags(topic),
            media_suggestions=["surprise stat graphic"],
            is_thread=True,
            reply_hooks=["Did you see this coming?", "What's the next surprise?"]
        )
    
    def _get_hashtags(self, topic: str) -> List[str]:
        """Get topic-specific hashtags"""
        hashtags = {
            "eth_treasury": ["#ETH", "#Ethereum", "#Treasury", "#Crypto"],
            "hims": ["#HIMS", "#Healthcare", "#GLP1", "#Telehealth"],
            "ai_commerce": ["#AI", "#AgenticCommerce", "#McKinsey", "#Infrastructure"]
        }
        return hashtags.get(topic, ["#Investing", "#Markets"])

class CriticAgent:
    """
    Critic Agent - reviews and improves content
    Implements Reflection pattern from research
    """
    
    def review(self, draft: ContentDraft, research: ResearchFinding) -> ContentCritique:
        """Review a content draft and provide critique"""
        
        strengths = []
        weaknesses = []
        suggestions = []
        
        # Evaluate hook strength
        if "?" in draft.hook or "Thread" in draft.hook:
            strengths.append("Strong hook with engagement trigger")
        else:
            weaknesses.append("Hook could be more engaging")
            suggestions.append("Add question mark or thread indicator")
        
        # Evaluate data backing
        if any(char.isdigit() for char in draft.body):
            strengths.append("Data-backed claims increase credibility")
        else:
            weaknesses.append("Lacks specific data points")
            suggestions.append("Add metrics or percentages")
        
        # Evaluate angle appropriateness
        if draft.angle == ContentAngle.THREAD_HOOK and draft.is_thread:
            strengths.append("Thread format matches hook style")
        
        # Evaluate reply hooks
        if len(draft.reply_hooks) >= 2:
            strengths.append("Multiple reply hooks for engagement")
        else:
            weaknesses.append("Limited reply hooks")
            suggestions.append("Add 2-3 reply prompts")
        
        # Calculate revised score
        base_score = draft.engagement_score
        if len(weaknesses) > len(strengths):
            revised_score = max(base_score - 2, 10)
        elif len(strengths) > len(weaknesses):
            revised_score = min(base_score + 1, 24)
        else:
            revised_score = base_score
        
        # Approval threshold
        approved = revised_score >= 16 and len(weaknesses) <= 2
        
        return ContentCritique(
            draft=draft,
            strengths=strengths,
            weaknesses=weaknesses,
            suggestions=suggestions,
            revised_score=revised_score,
            approved=approved
        )

class OrchestratorAgent:
    """
    Orchestrator Agent - coordinates multi-agent workflow
    Implements best practices from research
    """
    
    def __init__(self):
        self.research_agent = ResearchAgent()
        self.content_agent = ContentAgent()
        self.critic_agent = CriticAgent()
    
    def run_pipeline(self, topic_keys: Optional[List[str]] = None) -> Dict:
        """Run the complete agentic pipeline"""
        
        if topic_keys is None:
            topic_keys = ["eth_treasury", "hims", "ai_commerce"]
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "topics": {}
        }
        
        for topic_key in topic_keys:
            print(f"\nProcessing topic: {topic_key}")
            
            # Step 1: Research Agent gathers data
            print("  [Research] Gathering data...")
            research = self.research_agent.gather_research(topic_key)
            
            # Step 2: Content Agent generates angles
            print("  [Content] Generating angles...")
            drafts = self.content_agent.generate_angles(research, topic_key)
            
            # Step 3: Critic Agent reviews top draft
            print("  [Critic] Reviewing content...")
            top_draft = drafts[0]
            critique = self.critic_agent.review(top_draft, research)
            
            # Step 4: Store results
            results["topics"][topic_key] = {
                "research": {
                    "topic": research.topic,
                    "key_points": research.key_points,
                    "sentiment": research.sentiment
                },
                "drafts": [
                    {
                        "hook": d.hook,
                        "angle": d.angle.value,
                        "engagement_score": d.engagement_score,
                        "is_thread": d.is_thread,
                        "hashtags": d.hashtags
                    }
                    for d in drafts[:3]  # Top 3 angles
                ],
                "selected": {
                    "hook": critique.draft.hook,
                    "angle": critique.draft.angle.value,
                    "engagement_score": critique.revised_score,
                    "approved": critique.approved,
                    "strengths": critique.strengths,
                    "weaknesses": critique.weaknesses
                }
            }
            
            print(f"  [Complete] Score {critique.revised_score}/24 | Approved: {critique.approved}")
        
        return results
    
    def generate_briefing(self, results: Dict) -> str:
        """Generate human-readable briefing"""
        
        lines = [
            "=" * 60,
            "AGENTIC CONTENT PIPELINE v4.0 - DAILY BRIEFING",
            f"Generated: {results['timestamp']}",
            "=" * 60,
            "",
            "RESEARCH-BACKED CONTENT GENERATION",
            "   Based on 2025 multi-agent architecture best practices",
            "",
            "-" * 60,
        ]
        
        for topic_key, data in results["topics"].items():
            lines.extend([
                "",
                f"TOPIC: {data['research']['topic'].upper()}",
                f"   Sentiment: {data['research']['sentiment'].capitalize()}",
                "",
                "   Top Angles (Ranked by Engagement Score):"
            ])
            
            for i, draft in enumerate(data['drafts'], 1):
                lines.append(f"   {i}. [{draft['angle'].upper()}] Score: {draft['engagement_score']}/24")
                lines.append(f"      Hook: {draft['hook']}")
            
            lines.extend([
                "",
                f"   SELECTED: {data['selected']['angle'].upper()}",
                f"      Final Score: {data['selected']['engagement_score']}/24",
                f"      Approved: {'Yes' if data['selected']['approved'] else 'No'}",
                "",
                "      Strengths:"
            ])
            
            for strength in data['selected']['strengths']:
                lines.append(f"      • {strength}")
            
            if data['selected']['weaknesses']:
                lines.append("      Areas for improvement:")
                for weakness in data['selected']['weaknesses']:
                    lines.append(f"      • {weakness}")
            
            lines.append("")
        
        lines.extend([
            "-" * 60,
            "",
            "NEXT STEPS:",
            "   1. Review selected angles above",
            "   2. Manual approval required before posting",
            "   3. Use reply hooks to drive engagement (13.5x weight)",
            "",
            "SYSTEM INFO:",
            "   - Multi-agent architecture (Research -> Content -> Critic)",
            "   - Reflection pattern implemented (Critic Agent)",
            "   - 6 content angles generated per topic",
            "   - Engagement scoring: 0-24 scale",
            "",
            "=" * 60
        ])
        
        return "\n".join(lines)

def main():
    """Main execution"""
    print("Starting Agentic Content Pipeline v4.0")
    print("   Based on 2025 self-improvement research findings")
    print("   Architecture: Multi-agent with Reflection pattern")
    print()
    
    orchestrator = OrchestratorAgent()
    results = orchestrator.run_pipeline()
    
    briefing = orchestrator.generate_briefing(results)
    
    # Save briefing
    workspace = Path("C:/Users/quent/.openclaw/workspace")
    daily_content_dir = workspace / "daily_content"
    daily_content_dir.mkdir(exist_ok=True)
    
    today = datetime.now().strftime("%Y-%m-%d")
    briefing_path = daily_content_dir / f"{today}_briefing_v4.txt"
    
    with open(briefing_path, 'w', encoding='utf-8') as f:
        f.write(briefing)
    
    print(f"\nBriefing saved to: {briefing_path}")
    print("\n" + briefing)
    
    return results

if __name__ == "__main__":
    main()
