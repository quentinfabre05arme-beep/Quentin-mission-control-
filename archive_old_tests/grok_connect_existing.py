#!/usr/bin/env python3
"""
Grok Browser Automation - Use Existing Chrome Profile
Connects to your logged-in Chrome session
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

async def setup_grok_with_existing_profile():
    """Connect to existing Chrome profile with Grok login"""
    
    # Common Chrome user data paths
    possible_paths = [
        Path.home() / "AppData" / "Local" / "Google" / "Chrome" / "User Data",
        Path.home() / "AppData" / "Local" / "Microsoft" / "Edge" / "User Data",
        Path("C:/Users/quent/AppData/Local/Google/Chrome/User Data"),
    ]
    
    chrome_path = None
    for path in possible_paths:
        if path.exists():
            chrome_path = path
            print(f"Found Chrome profile at: {path}")
            break
    
    if not chrome_path:
        print("ERROR: Chrome profile not found!")
        print("Please check your Chrome installation.")
        return False
    
    print("\n" + "="*50)
    print("Connecting to your Chrome session...")
    print("="*50 + "\n")
    
    try:
        async with async_playwright() as p:
            # Launch Chrome with your existing profile
            browser = await p.chromium.launch_persistent_context(
                user_data_dir=str(chrome_path),
                headless=False,  # Show browser
                args=['--start-maximized', '--disable-extensions-except=']
            )
            
            page = await browser.new_page()
            
            # Navigate to Grok
            print("Navigating to grok.com...")
            await page.goto("https://grok.com")
            
            # Wait for page
            await page.wait_for_load_state("networkidle")
            
            # Check if we're logged in
            current_url = page.url
            print(f"\nCurrent URL: {current_url}")
            
            if "login" in current_url.lower() or "auth" in current_url.lower():
                print("\n⚠️  You may need to log in to Grok.")
                print("Please log in manually in the browser window.")
                print("\nPress Enter when logged in...")
                input()
            else:
                print("\n✅ Successfully connected to Grok!")
                print("You should be logged in already.")
            
            # Now ready to run prompts
            print("\n" + "="*50)
            print("BROWSER READY FOR GROK AUTOMATION")
            print("="*50)
            print("\nI can now:")
            print("1. Type prompts in the Grok chat")
            print("2. Wait for responses")
            print("3. Capture and save results")
            print("\nBrowser will stay open for automation.")
            
            # Keep browser open
            print("\nPress Ctrl+C to close when done...")
            try:
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                pass
            
            await browser.close()
            print("\nBrowser closed.")
            return True
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("- Make sure Chrome is not already running")
        print("- Try closing all Chrome windows first")
        print("- Check if the profile path is correct")
        return False

if __name__ == "__main__":
    result = asyncio.run(setup_grok_with_existing_profile())
    if result:
        print("\n✅ Setup complete! Ready for Grok automation.")
    else:
        print("\n❌ Setup failed. Try the cookie export method instead.")
