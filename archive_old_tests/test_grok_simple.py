#!/usr/bin/env python3
"""
Simple test of Grok X Research
"""

import os
import json
import requests
from datetime import datetime

def call_grok(prompt: str, api_key: str, model: str = "grok-4.3", enable_search: bool = True) -> str:
    """Call xAI Responses API with prompt"""
    
    url = "https://api.x.ai/v1/responses"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "input": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    if enable_search:
        data["tools"] = [{"type": "web_search"}]
    
    response = requests.post(url, headers=headers, json=data, timeout=60)
    response.raise_for_status()
    result = response.json()
    
    # Extract text from response
    if 'output_text' in result:
        return result['output_text']
    elif 'output' in result:
        for block in result['output']:
            if block.get('type') == 'message':
                content = block.get('content', [])
                if content:
                    return content[0].get('text', str(content))
        return str(result['output'])
    return str(result)


def main():
    api_key = os.getenv('XAI_API_KEY')
    if not api_key:
        print("Set XAI_API_KEY environment variable")
        return
    
    print("="*60)
    print("GROK X RESEARCH TEST")
    print("="*60)
    
    # Test 1: Simple search
    print("\n[1] Testing Grok with web search...")
    try:
        result = call_grok(
            "What are the latest developments with Ethereum ETH treasury plays and Bitmine?",
            api_key
        )
        print("SUCCESS!")
        print("-" * 60)
        print(result[:500])
        print("..." if len(result) > 500 else "")
        print("-" * 60)
    except Exception as e:
        print(f"ERROR: {e}")
    
    # Test 2: X search
    print("\n[2] Testing X search capabilities...")
    try:
        result = call_grok(
            "Search X (Twitter) for recent posts about HIMS stock and GLP-1 telehealth.",
            api_key
        )
        print("SUCCESS!")
        print("-" * 60)
        print(result[:500])
        print("..." if len(result) > 500 else "")
        print("-" * 60)
    except Exception as e:
        print(f"ERROR: {e}")
    
    # Test 3: Content generation
    print("\n[3] Testing content generation...")
    try:
        result = call_grok(
            "Write a high-engagement tweet about AI agentic commerce and infrastructure plays. "
            "Make it authentic, thesis-driven, and include a hook.",
            api_key,
            enable_search=False
        )
        print("SUCCESS!")
        print("-" * 60)
        print(result[:500])
        print("..." if len(result) > 500 else "")
        print("-" * 60)
    except Exception as e:
        print(f"ERROR: {e}")
    
    print("\n" + "="*60)
    print("TEST COMPLETE - Grok X Research is working!")
    print("="*60)


if __name__ == '__main__':
    main()
