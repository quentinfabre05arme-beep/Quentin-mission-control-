#!/usr/bin/env python3
"""
X Algorithm Optimizer v1.0
X/Twitter-specific content optimization based on 2026 algorithm insights
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple


class XAlgorithmOptimizer:
    """
    Optimizes content specifically for X/Twitter algorithm.
    Based on 2026 algorithm research and best practices.
    """
    
    # X Algorithm weights (2026)
    WEIGHTS = {
        "reply": 13.5,
        "repost": 20.0,
        "bookmark": 10.0,
        "like": 1.0,
        "link_penalty": 0.5,  # Links in main tweet reduce reach
        "video_boost": 2.5,
        "image_boost": 1.5,
        "rich_media_boost": 1.8
    }
    
    # Content performance multipliers
    PERFORMANCE_MULTIPLIERS = {
        "contrarian": 1.42,
        "data_driven": 1.35,
        "healthcare": 1.28,
        "generic_ai": 0.78,
        "question": 1.25,
        "how_to": 1.30,
        "thread": 1.50,
        "poll": 1.35
    }
    
    def __init__(self):
        self.best_times = [17, 9, 12, 20]  # 5PM, 9AM, 12PM, 8PM (24h format)
        self.optimal_posting_days = [2, 3, 4, 5]  # Tue-Fri (0=Monday)
        
    def score_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score content based on X algorithm criteria.
        Returns detailed scoring breakdown.
        """
        text = content.get("text", "")
        has_image = content.get("has_image", False)
        has_video = content.get("has_video", False)
        has_link = self._contains_link(text)
        is_thread = content.get("is_thread", False)
        
        scores = {
            "base_score": 50,
            "engagement_potential": 0,
            "content_type_bonus": 0,
            "format_optimization": 0,
            "link_penalty": 0,
            "media_bonus": 0,
            "content_style_bonus": 0,
            "total_score": 0
        }
        
        # Calculate engagement potential
        scores["engagement_potential"] = self._calculate_engagement_potential(text)
        
        # Content type bonuses
        if is_thread:
            scores["content_type_bonus"] += 25 * self.PERFORMANCE_MULTIPLIERS["thread"]
        
        # Format optimization
        scores["format_optimization"] = self._score_format(text)
        
        # Link penalty (external links in main tweet penalized)
        if has_link:
            scores["link_penalty"] = -15
        
        # Media bonuses
        if has_video:
            scores["media_bonus"] += 30 * self.WEIGHTS["video_boost"]
        elif has_image:
            scores["media_bonus"] += 15 * self.WEIGHTS["image_boost"]
        
        # Content style analysis
        scores["content_style_bonus"] = self._score_content_style(text)
        
        # Calculate total
        scores["total_score"] = (
            scores["base_score"] +
            scores["engagement_potential"] +
            scores["content_type_bonus"] +
            scores["format_optimization"] +
            scores["link_penalty"] +
            scores["media_bonus"] +
            scores["content_style_bonus"]
        )
        
        # Cap at 100
        scores["total_score"] = min(100, max(0, scores["total_score"]))
        
        return scores
    
    def optimize_for_algorithm(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimize content specifically for X algorithm performance.
        Returns optimized content with recommendations.
        """
        text = content.get("text", "")
        original_text = text
        
        optimizations = []
        
        # 1. Check for link - move to reply if present
        if self._contains_link(text):
            text, link = self._extract_and_remove_link(text)
            optimizations.append({
                "type": "link_moved_to_reply",
                "reason": "External links in main tweet penalized by algorithm",
                "link": link
            })
        
        # 2. Check for hashtag overuse
        hashtags = self._extract_hashtags(text)
        if len(hashtags) > 2:
            text = self._reduce_hashtags(text, max_hashtags=2)
            optimizations.append({
                "type": "hashtags_reduced",
                "reason": "Hashtags have minimal impact; semantic NLP used instead",
                "original_count": len(hashtags),
                "new_count": 2
            })
        
        # 3. Check for reply hook
        if not self._has_reply_hook(text):
            text = self._add_reply_hook(text)
            optimizations.append({
                "type": "reply_hook_added",
                "reason": "Replies weighted 13.5x - encouraging engagement"
            })
        
        # 4. Check for data/numbers
        if not self._has_data_points(text):
            optimizations.append({
                "type": "suggestion_add_data",
                "reason": "Data-driven content gets +35% engagement"
            })
        
        # 5. Check for contrarian angle
        if self._is_generic_ai_content(text):
            optimizations.append({
                "type": "suggestion_add_angle",
                "reason": "Generic AI content gets -22%; add contrarian or unique angle"
            })
        
        # 6. Optimize hook
        hook_score = self._score_hook(text)
        if hook_score < 70:
            text = self._improve_hook(text)
            optimizations.append({
                "type": "hook_improved",
                "reason": "Strong written hook paramount for first 30 min velocity"
            })
        
        # Calculate new score
        optimized_content = content.copy()
        optimized_content["text"] = text
        new_scores = self.score_content(optimized_content)
        old_scores = self.score_content(content)
        
        return {
            "original_content": original_text,
            "optimized_content": text,
            "original_score": old_scores["total_score"],
            "optimized_score": new_scores["total_score"],
            "score_improvement": new_scores["total_score"] - old_scores["total_score"],
            "optimizations": optimizations,
            "reply_link": link if self._contains_link(original_text) else None,
            "recommendations": self._generate_recommendations(content, new_scores)
        }
    
    def get_best_posting_time(self) -> Dict[str, Any]:
        """
        Get optimal posting times based on research.
        """
        now = datetime.now()
        
        # Find next optimal posting windows
        optimal_times = []
        
        for day_offset in range(7):
            target_date = now + timedelta(days=day_offset)
            day_of_week = target_date.weekday()
            
            if day_of_week in self.optimal_posting_days:
                for hour in self.best_times:
                    optimal_time = target_date.replace(hour=hour, minute=0, second=0)
                    
                    if optimal_time > now:
                        optimal_times.append({
                            "datetime": optimal_time.isoformat(),
                            "day": optimal_time.strftime("%A"),
                            "time": optimal_time.strftime("%I:%M %p"),
                            "hour_24": hour,
                            "score": self._calculate_time_score(optimal_time)
                        })
        
        # Sort by score and return top 5
        optimal_times.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "best_times": optimal_times[:5],
            "explanation": "Based on engagement velocity optimization. First 30 minutes critical."
        }
    
    def analyze_competitor_content(self, competitor_posts: List[Dict]) -> Dict[str, Any]:
        """
        Analyze competitor content for algorithm insights.
        """
        analysis = {
            "avg_engagement": 0,
            "best_performing": [],
            "common_patterns": [],
            "content_types": {},
            "posting_times": []
        }
        
        if not competitor_posts:
            return analysis
        
        # Calculate averages
        total_engagement = sum(p.get("engagement", 0) for p in competitor_posts)
        analysis["avg_engagement"] = total_engagement / len(competitor_posts)
        
        # Find top performers
        sorted_posts = sorted(competitor_posts, 
                            key=lambda x: x.get("engagement", 0), 
                            reverse=True)
        analysis["best_performing"] = sorted_posts[:3]
        
        # Identify patterns
        patterns = self._extract_patterns(competitor_posts)
        analysis["common_patterns"] = patterns
        
        return analysis
    
    def _calculate_engagement_potential(self, text: str) -> float:
        """Calculate potential engagement based on content factors."""
        score = 0
        
        # Questions drive replies (13.5x)
        if "?" in text:
            score += 15
        
        # Call to action
        if any(cta in text.lower() for cta in ["what do you think", "your thoughts", "agree", "disagree"]):
            score += 12
        
        # Numbers/data
        if re.search(r'\d+%|\d+\s+(million|billion|thousand)', text):
            score += 10
        
        # Strong hook words
        hook_words = ["breaking", "just", "new", "exclusive", "revealed", "secret", "why", "how"]
        if any(word in text.lower()[:50] for word in hook_words):
            score += 8
        
        return min(30, score)
    
    def _score_format(self, text: str) -> float:
        """Score format optimization."""
        score = 0
        
        # Line breaks for readability
        if "\n" in text:
            score += 5
        
        # Bullet points
        if any(marker in text for marker in ["•", "-", "→", "→"]):
            score += 8
        
        # Length optimization (71-100 chars for main tweet)
        if 71 <= len(text) <= 280:
            if len(text) <= 100:
                score += 10
            elif len(text) <= 150:
                score += 5
        
        return score
    
    def _score_content_style(self, text: str) -> float:
        """Score content style based on performance multipliers."""
        score = 0
        text_lower = text.lower()
        
        # Contrarian
        contrarian_words = ["actually", "wrong", "myth", "truth is", "real reason", "nobody talks about"]
        if any(word in text_lower for word in contrarian_words):
            score += 20 * (self.PERFORMANCE_MULTIPLIERS["contrarian"] - 1)
        
        # Data-driven
        if re.search(r'\d+%|\d+\s+x\s|study|research|data|survey', text_lower):
            score += 15 * (self.PERFORMANCE_MULTIPLIERS["data_driven"] - 1)
        
        # Healthcare
        healthcare_words = ["health", "medicine", "biotech", "longevity", "treatment", "drug"]
        if any(word in text_lower for word in healthcare_words):
            score += 15 * (self.PERFORMANCE_MULTIPLIERS["healthcare"] - 1)
        
        # How-to
        if text_lower.startswith("how to") or text_lower.startswith("how i"):
            score += 15 * (self.PERFORMANCE_MULTIPLIERS["how_to"] - 1)
        
        return score
    
    def _contains_link(self, text: str) -> bool:
        """Check if text contains external link."""
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return bool(re.search(url_pattern, text))
    
    def _extract_and_remove_link(self, text: str) -> Tuple[str, str]:
        """Extract link from text and return text without link + the link."""
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        match = re.search(url_pattern, text)
        
        if match:
            link = match.group(0)
            text_without_link = text.replace(link, "").strip()
            # Clean up extra spaces
            text_without_link = re.sub(r'\s+', ' ', text_without_link)
            return text_without_link, link
        
        return text, ""
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text."""
        return re.findall(r'#\w+', text)
    
    def _reduce_hashtags(self, text: str, max_hashtags: int = 2) -> str:
        """Reduce hashtags to specified maximum."""
        hashtags = self._extract_hashtags(text)
        
        if len(hashtags) <= max_hashtags:
            return text
        
        # Keep only first N hashtags
        for hashtag in hashtags[max_hashtags:]:
            text = text.replace(hashtag, "")
        
        return re.sub(r'\s+', ' ', text).strip()
    
    def _has_reply_hook(self, text: str) -> bool:
        """Check if text has reply hook."""
        reply_patterns = [
            r'what\s+(do\s+you\s+think|are\s+your\s+thoughts)',
            r'(agree|disree)\?',
            r'let\s+me\s+know',
            r'share\s+your',
            r'comment\s+below',
            r'thoughts\?',
            r'\?\s*$'  # Ends with question
        ]
        
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in reply_patterns)
    
    def _add_reply_hook(self, text: str) -> str:
        """Add reply hook to text."""
        hooks = [
            "\n\nWhat do you think?",
            "\n\nThoughts?",
            "\n\nAgree or disagree?",
            "\n\nWhat's your take?"
        ]
        
        import random
        hook = random.choice(hooks)
        
        # Ensure we don't exceed 280 chars
        if len(text) + len(hook) < 280:
            return text + hook
        else:
            return text[:277] + "..." + hook
    
    def _has_data_points(self, text: str) -> bool:
        """Check if text contains data points."""
        return bool(re.search(r'\d+%|\d+\s+(million|billion|thousand|%|x\s+)', text))
    
    def _is_generic_ai_content(self, text: str) -> bool:
        """Check if content appears to be generic AI content."""
        generic_patterns = [
            r'\b(Here are|Here is|Let me tell you|In conclusion|To summarize)\b',
            r'\b(delve|leverage|harness|robust|cutting-edge|game-changing)\b',
            r'(It is important to|One should|We should)'
        ]
        
        matches = sum(1 for pattern in generic_patterns if re.search(pattern, text, re.IGNORECASE))
        return matches >= 2
    
    def _score_hook(self, text: str) -> float:
        """Score the hook (first 50 chars)."""
        hook = text[:50]
        score = 50
        
        # Strong opening words
        strong_openers = ["breaking", "just", "new", "why", "how", "the real", "nobody"]
        if any(word in hook.lower() for word in strong_openers):
            score += 25
        
        # Contains numbers
        if re.search(r'\d', hook):
            score += 15
        
        # Creates curiosity gap
        if any(word in hook.lower() for word in ["secret", "truth", "revealed", "hidden", "actually"]):
            score += 10
        
        return min(100, score)
    
    def _improve_hook(self, text: str) -> str:
        """Improve the hook of the text."""
        strong_hooks = [
            "Just discovered ",
            "The real reason ",
            "Why most ",
            "Nobody talks about ",
            "Breaking: ",
            "New data shows "
        ]
        
        import random
        hook = random.choice(strong_hooks)
        
        # Remove weak opening if present
        weak_openers = ["Here is", "Here are", "Let me", "I think", "In my opinion"]
        for opener in weak_openers:
            if text.lower().startswith(opener.lower()):
                text = text[len(opener):].strip()
        
        # Ensure first letter is capitalized
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
        
        return hook + text
    
    def _calculate_time_score(self, dt: datetime) -> float:
        """Calculate score for a specific posting time."""
        score = 50
        
        # Time of day
        hour = dt.hour
        if hour in self.best_times:
            score += 30
        elif 9 <= hour <= 20:
            score += 15
        
        # Day of week
        day = dt.weekday()
        if day in self.optimal_posting_days:
            score += 20
        
        return score
    
    def _extract_patterns(self, posts: List[Dict]) -> List[str]:
        """Extract common patterns from posts."""
        patterns = []
        
        # Analyze for common traits
        has_threads = sum(1 for p in posts if p.get("is_thread", False))
        has_videos = sum(1 for p in posts if p.get("has_video", False))
        has_data = sum(1 for p in posts if self._has_data_points(p.get("text", "")))
        
        if has_threads > len(posts) * 0.3:
            patterns.append(f"{has_threads}/{len(posts)} posts are threads")
        if has_videos > len(posts) * 0.4:
            patterns.append(f"{has_videos}/{len(posts)} posts include video")
        if has_data > len(posts) * 0.5:
            patterns.append(f"{has_data}/{len(posts)} posts include data points")
        
        return patterns
    
    def _generate_recommendations(self, content: Dict, scores: Dict) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []
        
        if scores["total_score"] < 60:
            recommendations.append("Add a strong hook in first 50 characters")
        
        if not content.get("has_video") and not content.get("has_image"):
            recommendations.append("Add rich media (video preferred) for algorithm boost")
        
        if self._contains_link(content.get("text", "")):
            recommendations.append("Move external link to first reply to avoid penalty")
        
        if scores["engagement_potential"] < 10:
            recommendations.append("Add a question or call-to-action to drive replies")
        
        return recommendations


def main():
    """Example usage of X Algorithm Optimizer."""
    optimizer = XAlgorithmOptimizer()
    
    # Example content
    content = {
        "text": "Here are 5 reasons why AI is changing content creation. "
                "Check out my full article at https://example.com/ai-content "
                "#AI #ContentCreation #DigitalMarketing",
        "has_image": True,
        "has_video": False,
        "is_thread": False
    }
    
    # Score content
    scores = optimizer.score_content(content)
    print("Content Scores:")
    for key, value in scores.items():
        print(f"  {key}: {value}")
    
    # Optimize content
    optimization = optimizer.optimize_for_algorithm(content)
    print("\nOptimization Results:")
    print(f"  Original Score: {optimization['original_score']}")
    print(f"  Optimized Score: {optimization['optimized_score']}")
    print(f"  Improvement: {optimization['score_improvement']}")
    print(f"\nOriginal: {optimization['original_content']}")
    print(f"Optimized: {optimization['optimized_content']}")
    
    # Get best posting times
    best_times = optimizer.get_best_posting_time()
    print("\nBest Posting Times:")
    for time in best_times["best_times"][:3]:
        print(f"  {time['day']} at {time['time']} (Score: {time['score']})")


if __name__ == "__main__":
    main()
