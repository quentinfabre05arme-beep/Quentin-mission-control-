"""
X Account Research Engine
Continuous monitoring + daily sentiment + post delivery here
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict

sys.stdout.reconfigure(encoding='utf-8')

@dataclass
class ResearchUpdate:
    """Research update for a topic"""
    topic: str
    source: str
    timestamp: str
    headline: str
    summary: str
    sentiment: str  # bullish, bearish, neutral
    impact: str  # high, medium, low
    price_data: Optional[Dict] = None
    key_metrics: Optional[Dict] = None

@dataclass
class AccountReview:
    """Daily account review"""
    date: str
    followers: int
    followers_change: int
    engagement_rate: float
    top_post: Optional[str]
    sentiment_score: float  # 0-100
    recommendations: List[str]

@dataclass
class PostDraft:
    """Post ready for delivery"""
    id: str
    format: str  # short, long, thread
    topic: str
    content: str
    hashtags: List[str]
    best_time: str
    confidence: float
    created_at: str

class XResearchEngine:
    """
    Research engine for @quentinvest1
    - Continuous topic monitoring
    - Daily account sentiment
    - Post delivery here
    """
    
    def __init__(self, workspace_path: str = None):
        self.workspace = Path(workspace_path) if workspace_path else Path(__file__).parent
        self.research_file = self.workspace / "operations" / "research_updates.json"
        self.review_file = self.workspace / "operations" / "account_reviews.json"
        self.drafts_file = self.workspace / "operations" / "post_drafts.json"
        
        for f in [self.research_file, self.review_file, self.drafts_file]:
            f.parent.mkdir(parents=True, exist_ok=True)
        
        self.updates: List[ResearchUpdate] = []
        self.reviews: List[AccountReview] = []
        self.drafts: List[PostDraft] = []
        
        self._load_data()
    
    def _load_data(self):
        """Load existing data"""
        if self.research_file.exists():
            with open(self.research_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.updates = [ResearchUpdate(**u) for u in data]
        
        if self.review_file.exists():
            with open(self.review_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.reviews = [AccountReview(**r) for r in data]
        
        if self.drafts_file.exists():
            with open(self.drafts_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.drafts = [PostDraft(**d) for d in data]
    
    def _save_data(self):
        """Save data to disk"""
        with open(self.research_file, 'w', encoding='utf-8') as f:
            json.dump([asdict(u) for u in self.updates], f, indent=2, ensure_ascii=False)
        
        with open(self.review_file, 'w', encoding='utf-8') as f:
            json.dump([asdict(r) for r in self.reviews], f, indent=2, ensure_ascii=False)
        
        with open(self.drafts_file, 'w', encoding='utf-8') as f:
            json.dump([asdict(d) for d in self.drafts], f, indent=2, ensure_ascii=False)
    
    def record_research(self, topic: str, source: str, headline: str, 
                       summary: str, sentiment: str, impact: str,
                       price_data: Dict = None, key_metrics: Dict = None):
        """Record a research update"""
        update = ResearchUpdate(
            topic=topic,
            source=source,
            timestamp=datetime.now().isoformat(),
            headline=headline,
            summary=summary,
            sentiment=sentiment,
            impact=impact,
            price_data=price_data,
            key_metrics=key_metrics
        )
        
        self.updates.append(update)
        self._save_data()
        
        print(f"[RESEARCH] {topic}: {headline[:50]}...")
        return update
    
    def get_latest_by_topic(self, topic: str, hours: int = 24) -> List[ResearchUpdate]:
        """Get latest research for a topic"""
        cutoff = datetime.now() - timedelta(hours=hours)
        return [
            u for u in self.updates 
            if u.topic == topic and datetime.fromisoformat(u.timestamp) > cutoff
        ]
    
    def record_account_review(self, followers: int, engagement_rate: float,
                           top_post: str = None, sentiment_score: float = 50.0,
                           recommendations: List[str] = None):
        """Record daily account review"""
        # Calculate follower change
        followers_change = 0
        if self.reviews:
            last = self.reviews[-1]
            followers_change = followers - last.followers
        
        review = AccountReview(
            date=datetime.now().strftime("%Y-%m-%d"),
            followers=followers,
            followers_change=followers_change,
            engagement_rate=engagement_rate,
            top_post=top_post,
            sentiment_score=sentiment_score,
            recommendations=recommendations or []
        )
        
        self.reviews.append(review)
        self._save_data()
        
        return review
    
    def create_post_draft(self, format: str, topic: str, content: str,
                         hashtags: List[str], best_time: str, confidence: float) -> PostDraft:
        """Create a post draft ready for delivery"""
        draft = PostDraft(
            id=f"draft_{topic}_{int(datetime.now().timestamp())}",
            format=format,
            topic=topic,
            content=content,
            hashtags=hashtags,
            best_time=best_time,
            confidence=confidence,
            created_at=datetime.now().isoformat()
        )
        
        self.drafts.append(draft)
        self._save_data()
        
        return draft
    
    def get_ready_posts(self) -> List[PostDraft]:
        """Get posts ready to deliver"""
        return [d for d in self.drafts if d.confidence >= 0.7]
    
    def get_account_summary(self) -> Dict:
        """Get current account summary"""
        if not self.reviews:
            return {"error": "No account data"}
        
        latest = self.reviews[-1]
        
        # Get 7-day trend
        week_ago = datetime.now() - timedelta(days=7)
        week_reviews = [r for r in self.reviews 
                       if datetime.strptime(r.date, "%Y-%m-%d") >= week_ago]
        
        if len(week_reviews) >= 2:
            follower_growth = week_reviews[-1].followers - week_reviews[0].followers
        else:
            follower_growth = latest.followers_change
        
        return {
            "followers": latest.followers,
            "followers_change_daily": latest.followers_change,
            "followers_change_weekly": follower_growth,
            "engagement_rate": latest.engagement_rate,
            "sentiment_score": latest.sentiment_score,
            "top_post": latest.top_post,
            "recommendations": latest.recommendations,
            "target_progress": (latest.followers / 10000) * 100
        }
    
    def get_research_digest(self, hours: int = 24) -> str:
        """Generate research digest for delivery"""
        topics = ["eth_treasury", "hims_healthcare", "ai_agentic_commerce"]
        
        digest = f"""# Research Digest - {datetime.now().strftime('%Y-%m-%d %H:%M')}

"""
        
        for topic in topics:
            updates = self.get_latest_by_topic(topic, hours)
            if updates:
                digest += f"\n## {topic.replace('_', ' ').title()}\n\n"
                for u in updates[-3:]:  # Last 3 per topic
                    digest += f"**{u.headline}**\n"
                    digest += f"{u.summary[:150]}...\n"
                    digest += f"Sentiment: {u.sentiment.upper()} | Impact: {u.impact}\n\n"
        
        return digest

if __name__ == "__main__":
    engine = XResearchEngine("C:\\Users\\quent\\.openclaw\\workspace")
    
    # Demo: Record sample research
    engine.record_research(
        topic="eth_treasury",
        source="X/Twitter",
        headline="BlackRock ETF sees $500M inflows this week",
        summary="Institutional ETH adoption accelerating. BlackRock's ETHA ETF reaching new AUM milestones as corporate treasuries begin exploring allocations.",
        sentiment="bullish",
        impact="high",
        price_data={"ETH": 1820, "change_24h": 2.3}
    )
    
    engine.record_research(
        topic="hims_healthcare",
        source="Earnings Call",
        headline="HIMS Q2 guidance raised to $280M revenue",
        summary="Company raises Q2 revenue guidance citing strong GLP-1 demand. Novo Nordisk partnership driving customer acquisition above expectations.",
        sentiment="bullish",
        impact="high"
    )
    
    # Demo: Record account review
    engine.record_account_review(
        followers=218,
        engagement_rate=5.2,
        top_post="ETH Treasury thread",
        sentiment_score=72,
        recommendations=["Post daily at 8am", "Add more charts", "Engage with 3 Tier 1 targets"]
    )
    
    # Demo: Create post draft
    engine.create_post_draft(
        format="long",
        topic="eth_treasury",
        content="BlackRock's ETH ETF just hit $500M inflows this week. The institutional ETH playbook is accelerating. Meanwhile, 19 public companies now hold ETH treasuries worth $13B+. The treasury revolution isn't coming — it's here.",
        hashtags=["#ETH", "#Treasury", "#Crypto"],
        best_time="08:00",
        confidence=0.85
    )
    
    print(engine.get_research_digest())
    print("\nAccount Summary:", engine.get_account_summary())
