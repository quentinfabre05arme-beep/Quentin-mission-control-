#!/usr/bin/env python3
"""
Browser Automation with User Profile
Uses OpenClaw browser tool with authenticated Chrome session
"""

import subprocess
import json
import time
from pathlib import Path

def run_browser_command(command):
    """Run OpenClaw browser command"""
    result = subprocess.run(
        ["openclaw", "browser"] + command.split(),
        capture_output=True,
        text=True,
        cwd="C:\\Users\\quent\\.openclaw\\workspace"
    )
    return result.stdout, result.stderr, result.returncode

def test_grok_access():
    """Test if we can access Grok with user profile"""
    
    print("Testing Grok access with user Chrome profile...")
    print("=" * 50)
    
    # Navigate to Grok
    stdout, stderr, code = run_browser_command("navigate https://grok.com --profile user")
    
    if code != 0:
        print(f"Error navigating: {stderr}")
        return False
    
    print(f"Navigation result:\n{stdout}")
    
    # Wait for page load
    time.sleep(3)
    
    # Take snapshot to check login state
    stdout, stderr, code = run_browser_command("snapshot --efficient")
    
    if code != 0:
        print(f"Error taking snapshot: {stderr}")
        return False
    
    print(f"\nSnapshot result:\n{stdout[:1000]}...")  # First 1000 chars
    
    return True

def main():
    """Main automation workflow"""
    
    print("GROK AUTOMATION WITH USER PROFILE")
    print("=" * 50)
    print()
    
    # Test connection
    if not test_grok_access():
        print("\n❌ Failed to access Grok")
        print("\nPossible issues:")
        print("- Chrome user profile not logged into X")
        print("- Browser tool not properly configured")
        print("- Chrome executable path incorrect")
        return
    
    print("\n✅ Successfully accessed Grok!")
    print("\nReady for research automation.")

if __name__ == "__main__":
    main()
