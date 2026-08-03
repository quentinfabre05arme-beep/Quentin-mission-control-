#!/usr/bin/env python3
"""
Content Performance Tracker
Based on 2025 research: X algorithm engagement hierarchy and analytics
Implements weighted engagement scoring and trend analysis
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import statistics

@dataclass
class PostMetrics:
    """Individual post performance metrics"""
    post_id: str
    timestamp: datetime
    topic: str
    angle_type: str
    
    # Raw metrics
    impressions: int = 0
    likes: int = 0
    replies: int = 0
    retweets: int = 0
    quote_tweets: int = 0
    profile_clicks: int = 0
    link_clicks: int = 0
    
    # Derived metrics
    engagement_rate: float = 0.0
    weighted_score: float = 0.0
    
    def calculate_weighted_score(self) -> float:
        """Calculate weighted engagement score based on X algorithm"""
        # X algorithm weights (from research)
        weights = {
            "retweet": 20,
            "reply": 13.5,
            "profile_click": 12,
            "link_click": 11,
            "like": 1
        }
        
        self.weighted_score = (
            self.retweets * weights["retweet"] +
            self.quote_tweets * weights["retweet"] +  # Same weight as RT
            self.replies * weights["reply"] +
            self.profile_clicks * weights["profile_click"] +
            self.link_clicks * weights["link_click"] +
            self.likes * weights["like"]
        )
        
        if self.impressions > 0:
            self.engagement_rate = (
                (self.likes + self.replies + self.retweets + self.quote_tweets) / 
                self.impressions * 100
            )
        
        return self.weighted_score

@dataclass
class TopicPerformance:
    """Aggregated performance by topic"""
    topic: str
    posts: List[PostMetrics] = field(default_factory=list)
    
    @property
    def avg_engagement_rate(self) -> float:
        if not self.posts:
            return 0.0
        return statistics.mean([p.engagement_rate for p in self.posts])
    
    @property
    def avg_weighted_score(self) -> float:
        if not self.posts:
            return 0.0
        return statistics.mean([p.weighted_score for p in self.posts])
    
    @property
    def total_impressions(self) -> int:
        return sum(p.impressions for p in self.posts)
    
    @property
    def best_performing_angle(self) -> Optional[str]:
        if not self.posts:
            return None
        angle_scores = defaultdict(list)
        for post in self.posts:
            angle_scores[post.angle_type].append(post.weighted_score)
        
        avg_by_angle = {
            angle: statistics.mean(scores) 
            for angle, scores in angle_scores.items()
        }
        return max(avg_by_angle.items(), key=lambda x: x[1])[0] if avg_by_angle else None

class ContentPerformanceTracker:
    """
    Tracks and analyzes content performance
    Based on 2025 social media intelligence research
    """
    
    def __init__(self):
        self.workspace = Path("C:/Users/quent/.openclaw/workspace")
        self.analytics_dir = self.workspace / "operations" / "analytics"
        self.analytics_dir.mkdir(parents=True, exist_ok=True)
        
        self.metrics_file = self.analytics_dir / "content_metrics.json"
        self.performance_data = self._load_metrics()
        
        # Engagement benchmarks from research
        self.benchmarks = {
            "good_engagement_rate": 5.0,  # 5%+ is good
            "excellent_engagement_rate": 10.0,  # 10%+ is excellent
            "target_weighted_score": 100,  # Target weighted score per post
        }
    
    def _load_metrics(self) -> List[Dict]:
        """Load existing metrics from file"""
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_metrics(self):
        """Save metrics to file"""
        with open(self.metrics_file, 'w', encoding='utf-8') as f:
            json.dump(self.performance_data, f, indent=2)
    
    def record_post(self, post_data: Dict):
        """Record a new post with its metrics"""
        self.performance_data.append(post_data)
        self._save_metrics()
    
    def get_topic_performance(self, days: int = 30) -> Dict[str, TopicPerformance]:
        """Get performance aggregated by topic"""
        cutoff = datetime.now() - timedelta(days=days)
        
        topic_performance = {}
        
        for entry in self.performance_data:
            post_time = datetime.fromisoformat(entry.get("timestamp", "2024-01-01"))
            if post_time < cutoff:
                continue
            
            topic = entry.get("topic", "unknown")
            if topic not in topic_performance:
                topic_performance[topic] = TopicPerformance(topic=topic)
            
            metrics = PostMetrics(
                post_id=entry.get("post_id", ""),
                timestamp=post_time,
                topic=topic,
                angle_type=entry.get("angle_type", "unknown"),
                impressions=entry.get("impressions", 0),
                likes=entry.get("likes", 0),
                replies=entry.get("replies", 0),
                retweets=entry.get("retweets", 0),
                quote_tweets=entry.get("quote_tweets", 0),
                profile_clicks=entry.get("profile_clicks", 0),
                link_clicks=entry.get("link_clicks", 0)
            )
            metrics.calculate_weighted_score()
            topic_performance[topic].posts.append(metrics)
        
        return topic_performance
    
    def get_angle_performance(self, days: int = 30) -> Dict[str, Dict]:
        """Get performance by content angle type"""
        cutoff = datetime.now() - timedelta(days=days)
        
        angle_stats = defaultdict(lambda: {
            "count": 0,
            "total_impressions": 0,
            "total_engagement": 0,
            "avg_engagement_rate": 0.0,
            "avg_weighted_score": 0.0
        })
        
        for entry in self.performance_data:
            post_time = datetime.fromisoformat(entry.get("timestamp", "2024-01-01"))
            if post_time < cutoff:
                continue
            
            angle = entry.get("angle_type", "unknown")
            angle_stats[angle]["count"] += 1
            angle_stats[angle]["total_impressions"] += entry.get("impressions", 0)
            
            engagement = (
                entry.get("likes", 0) +
                entry.get("replies", 0) +
                entry.get("retweets", 0) +
                entry.get("quote_tweets", 0)
            )
            angle_stats[angle]["total_engagement"] += engagement
        
        # Calculate averages
        for angle, stats in angle_stats.items():
            if stats["total_impressions"] > 0:
                stats["avg_engagement_rate"] = (
                    stats["total_engagement"] / stats["total_impressions"] * 100
                )
        
        return dict(angle_stats)
    
    def get_optimal_posting_times(self) -> Dict[str, any]:
        """Analyze optimal posting times based on performance"""
        hourly_performance = defaultdict(lambda: {"posts": 0, "total_engagement": 0})
        
        for entry in self.performance_data:
            post_time = datetime.fromisoformat(entry.get("timestamp", "2024-01-01T12:00:00"))
            hour = post_time.hour
            
            engagement = (
                entry.get("likes", 0) +
                entry.get("replies", 0) +
                entry.get("retweets", 0) * 20  # Weight retweets heavily
            )
            
            hourly_performance[hour]["posts"] += 1
            hourly_performance[hour]["total_engagement"] += engagement
        
        # Calculate average engagement per post by hour
        optimal_times = {}
        for hour, stats in hourly_performance.items():
            if stats["posts"] > 0:
                optimal_times[hour] = stats["total_engagement"] / stats["posts"]
        
        # Sort by performance
        sorted_times = sorted(optimal_times.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "best_hours": [h for h, _ in sorted_times[:3]],
            "hourly_avg": dict(sorted_times)
        }
    
    def generate_performance_report(self, days: int = 30) -> str:
        """Generate a comprehensive performance report"""
        
        topic_perf = self.get_topic_performance(days)
        angle_perf = self.get_angle_performance(days)
        optimal_times = self.get_optimal_posting_times()
        
        lines = [
            "=" * 60,
            "CONTENT PERFORMANCE REPORT",
            f"Period: Last {days} days",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "=" * 60,
            ""
        ]
        
        # Topic performance
        lines.extend([
            "TOPIC PERFORMANCE",
            "-" * 40
        ])
        
        for topic, perf in sorted(topic_perf.items(), 
                                   key=lambda x: x[1].avg_weighted_score, 
                                   reverse=True):
            lines.extend([
                f"\n{topic.upper()}",
                f"  Posts: {len(perf.posts)}",
                f"  Avg Engagement Rate: {perf.avg_engagement_rate:.2f}%",
                f"  Avg Weighted Score: {perf.avg_weighted_score:.1f}",
                f"  Total Impressions: {perf.total_impressions:,}",
                f"  Best Angle: {perf.best_performing_angle or 'N/A'}"
            ])
        
        # Angle performance
        lines.extend([
            "",
            "-" * 40,
            "ANGLE PERFORMANCE",
            "-" * 40
        ])
        
        for angle, stats in sorted(angle_perf.items(),
                                    key=lambda x: x[1]["avg_engagement_rate"],
                                    reverse=True):
            lines.extend([
                f"\n{angle.upper()}",
                f"  Posts: {stats['count']}",
                f"  Avg Engagement Rate: {stats['avg_engagement_rate']:.2f}%",
                f"  Total Impressions: {stats['total_impressions']:,}"
            ])
        
        # Optimal posting times
        lines.extend([
            "",
            "-" * 40,
            "OPTIMAL POSTING TIMES",
            "-" * 40,
            f"\nBest Hours (Paris Time): {optimal_times['best_hours']}",
            ""
        ])
        
        # Recommendations
        lines.extend([
            "-" * 40,
            "RECOMMENDATIONS",
            "-" * 40,
            ""
        ])
        
        # Find best performing topic
        if topic_perf:
            best_topic = max(topic_perf.items(), key=lambda x: x[1].avg_weighted_score)
            lines.append(f"1. Focus on {best_topic[0]} - highest weighted engagement score")
        
        # Find best angle
        if angle_perf:
            best_angle = max(angle_perf.items(), key=lambda x: x[1]["avg_engagement_rate"])
            lines.append(f"2. Use {best_angle[0]} angle more - highest engagement rate")
        
        # Optimal timing
        if optimal_times["best_hours"]:
            best_hour = optimal_times["best_hours"][0]
            lines.append(f"3. Post at {best_hour}:00 Paris time for optimal engagement")
        
        lines.extend([
            "",
            "=" * 60
        ])
        
        return "\n".join(lines)
    
    def get_content_recommendations(self) -> Dict:
        """Get data-driven content recommendations"""
        
        topic_perf = self.get_topic_performance(days=30)
        angle_perf = self.get_angle_performance(days=30)
        
        recommendations = {
            "top_topics": [],
            "top_angles": [],
            "underperforming": [],
            "suggested_focus": []
        }
        
        # Top topics
        sorted_topics = sorted(topic_perf.items(), 
                              key=lambda x: x[1].avg_weighted_score,
                              reverse=True)
        recommendations["top_topics"] = [
            {"topic": t, "score": p.avg_weighted_score}
            for t, p in sorted_topics[:2]
        ]
        
        # Top angles
        sorted_angles = sorted(angle_perf.items(),
                              key=lambda x: x[1]["avg_engagement_rate"],
                              reverse=True)
        recommendations["top_angles"] = [
            {"angle": a, "engagement_rate": s["avg_engagement_rate"]}
            for a, s in sorted_angles[:3]
        ]
        
        # Underperforming (for improvement)
        recommendations["underperforming"] = [
            {"topic": t, "score": p.avg_weighted_score}
            for t, p in sorted_topics[-2:] if len(sorted_topics) > 2
        ]
        
        # Suggested focus
        if recommendations["top_topics"] and recommendations["top_angles"]:
            recommendations["suggested_focus"] = [
                f"Create {recommendations['top_angles'][0]['angle']} content",
                f"about {recommendations['top_topics'][0]['topic']}",
                "at optimal posting times"
            ]
        
        return recommendations

def main():
    """Generate performance report"""
    tracker = ContentPerformanceTracker()
    
    # Generate report
    report = tracker.generate_performance_report(days=30)
    
    # Save report
    report_path = tracker.analytics_dir / f"performance_report_{datetime.now().strftime('%Y-%m-%d')}.txt"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)
    print(f"\nReport saved: {report_path}")
    
    # Print recommendations
    recommendations = tracker.get_content_recommendations()
    print("\n" + "=" * 60)
    print("CONTENT RECOMMENDATIONS")
    print("=" * 60)
    print(json.dumps(recommendations, indent=2))

if __name__ == "__main__":
    main()
