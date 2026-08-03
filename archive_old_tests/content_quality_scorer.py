#!/usr/bin/env python3
"""
Content Quality Scorer Module
Scores content quality based on research findings
Based on: X algorithm insights and engagement optimization research
"""

import json
from datetime import datetime
from pathlib import Path

class ContentQualityScorer:
    """Score content quality based on multiple dimensions"""
    
    # Scoring rubric based on research
    SCORING_CRITERIA = {
        "hook_strength": {
            "weight": 4,
            "description": "Opening that stops the scroll",
            "indicators": ["question", "contrarian", "surprising stat", "personal story"]
        },
        "data_backing": {
            "weight": 3,
            "description": "Specific numbers and facts",
            "indicators": ["dollar amounts", "percentages", "timeframes", "comparisons"]
        },
        "readability": {
            "weight": 2,
            "description": "Easy to consume",
            "indicators": ["short sentences", "line breaks", "bullet points"]
        },
        "engagement_potential": {
            "weight": 4,
            "description": "Drives replies/retweets",
            "indicators": ["reply hook", "CTA", "controversial take", "insight"]
        },
        "thread_structure": {
            "weight": 3,
            "description": "Logical flow for threads",
            "indicators": ["clear progression", "each tweet standalone", "strong finish"]
        },
        "algorithm_fit": {
            "weight": 3,
            "description": "Optimizes for X algorithm",
            "indicators": ["rich media suggestion", "optimal length", "hashtag strategy"]
        }
    }
    
    MAX_SCORE = 24  # Maximum possible score
    
    def __init__(self):
        self.score_history = []
    
    def score_hook_strength(self, content):
        """Score opening hook (0-4)"""
        score = 0
        content_lower = content.lower()
        
        # Check for hook indicators
        if any(indicator in content_lower for indicator in ["you", "here's", "thread", "most"]):
            score += 2
        if any(indicator in content_lower for indicator in ["don't", "wrong", "actually", "surprising"]):
            score += 2
        
        return min(score, 4)
    
    def score_data_backing(self, content):
        """Score data backing (0-3)"""
        score = 0
        
        # Check for numbers
        import re
        numbers = re.findall(r'\$[\d,]+(?:\.\d+)?[BMK]?|[\d,]+(?:\.\d+)?%', content)
        if len(numbers) >= 2:
            score += 2
        if len(numbers) >= 4:
            score += 1
        
        return min(score, 3)
    
    def score_readability(self, content):
        """Score readability (0-2)"""
        score = 0
        
        # Short sentences
        sentences = content.split('.')
        avg_len = sum(len(s) for s in sentences) / max(len(sentences), 1)
        if avg_len < 80:
            score += 1
        
        # Line breaks
        if content.count('\n') >= 2:
            score += 1
        
        return min(score, 2)
    
    def score_engagement_potential(self, content):
        """Score engagement potential (0-4)"""
        score = 0
        content_lower = content.lower()
        
        # Reply hooks
        if any(indicator in content_lower for indicator in ["agree?", "thoughts?", "what do you think"]):
            score += 2
        
        # Controversial/strong takes
        if any(indicator in content_lower for indicator in ["actually", "unpopular opinion", "most people"]):
            score += 2
        
        return min(score, 4)
    
    def score_thread_structure(self, content):
        """Score thread structure (0-3)"""
        score = 0
        
        # Check for thread markers
        if '1/' in content or '1.' in content:
            score += 1
        
        # Strong finish
        if any(indicator in content.lower() for indicator in ["follow for more", "what did i miss", "tl;dr"]):
            score += 1
        
        # Logical progression
        if content.count('\n\n') >= 2:
            score += 1
        
        return min(score, 3)
    
    def score_algorithm_fit(self, content):
        """Score algorithm optimization (0-3)"""
        score = 0
        
        # Optimal length (rough check)
        char_count = len(content)
        if 100 <= char_count <= 280:
            score += 1
        
        # Hashtag strategy (0-2 hashtags optimal)
        hashtag_count = content.count('#')
        if 0 <= hashtag_count <= 2:
            score += 1
        
        # Media suggestion
        if any(indicator in content.lower() for indicator in ["chart", "image", "graphic", "visual"]):
            score += 1
        
        return min(score, 3)
    
    def score_content(self, content, content_type="single"):
        """Score full content across all dimensions"""
        scores = {
            "hook_strength": self.score_hook_strength(content),
            "data_backing": self.score_data_backing(content),
            "readability": self.score_readability(content),
            "engagement_potential": self.score_engagement_potential(content),
            "thread_structure": self.score_thread_structure(content),
            "algorithm_fit": self.score_algorithm_fit(content)
        }
        
        # Calculate weighted total
        weights = {
            "hook_strength": 4,
            "data_backing": 3,
            "readability": 2,
            "engagement_potential": 4,
            "thread_structure": 3,
            "algorithm_fit": 3
        }
        
        total = sum(scores[k] for k in scores)
        max_possible = sum(weights.values())
        
        return {
            "scores": scores,
            "total": total,
            "max_possible": max_possible,
            "percentage": round((total / max_possible) * 100, 1),
            "content_type": content_type
        }
    
    def score_multiple_angles(self, angles_dict):
        """Score multiple content angles and return best"""
        results = {}
        
        for angle_name, content in angles_dict.items():
            results[angle_name] = self.score_content(content)
        
        # Sort by score
        sorted_results = sorted(results.items(), key=lambda x: x[1]["total"], reverse=True)
        
        return {
            "all_scores": results,
            "best_angle": sorted_results[0][0] if sorted_results else None,
            "best_score": sorted_results[0][1]["total"] if sorted_results else 0,
            "ranked": sorted_results
        }
    
    def generate_quality_report(self, scoring_results):
        """Generate human-readable quality report"""
        lines = [
            "🎯 Content Quality Analysis",
            f"Generated: {datetime.now().isoformat()}",
            ""
        ]
        
        if "ranked" in scoring_results:
            lines.append("Ranked Angles:")
            for angle_name, score_data in scoring_results["ranked"]:
                lines.append(f"  {angle_name}: {score_data['total']}/{self.MAX_SCORE} ({score_data['percentage']}%)")
                
                # Show breakdown
                breakdown = []
                for criterion, score in score_data["scores"].items():
                    max_score = self.SCORING_CRITERIA[criterion]["weight"]
                    breakdown.append(f"{criterion}: {score}/{max_score}")
                lines.append(f"    ({', '.join(breakdown)})")
            
            lines.append("")
            lines.append(f"🏆 Best Angle: {scoring_results['best_angle']} ({scoring_results['best_score']}/{self.MAX_SCORE})")
        
        return "\n".join(lines)
    
    def save_scores(self, results, output_dir="operations/quality"):
        """Save scoring results to file"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        file_path = output_path / f"quality_scores_{date_str}.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        return file_path

def main():
    """Test quality scorer"""
    scorer = ContentQualityScorer()
    
    # Sample content angles
    angles = {
        "contrarian": "Most people think ETH is just a cryptocurrency. They're wrong. It's actually the infrastructure layer for the entire digital economy. Here's why...",
        "data-driven": "Bitmine now holds 5.74M ETH worth $18.2B. That's 4.8% of all ETH in circulation. Here's what this means for the market..."
    }
    
    results = scorer.score_multiple_angles(angles)
    print(scorer.generate_quality_report(results))

if __name__ == "__main__":
    main()
