import asyncio
from playwright.async_api import async_playwright
import os
import shutil
import json

async def post_to_x():
    """Post to X using Chrome profile with login fallback"""
    
    source_profile = os.path.expandvars(r"C:\Users\quent\AppData\Local\Google\Chrome\User Data")
    temp_profile = os.path.expandvars(r"C:\Users\quent\AppData\Local\Temp\chrome_profile_copy")
    
    # Clean up old temp profile
    if os.path.exists(temp_profile):
        shutil.rmtree(temp_profile)
    
    # Copy essential profile files
    os.makedirs(temp_profile, exist_ok=True)
    essential_files = ["Default/Cookies", "Default/Login Data", "Default/Preferences", "Local State"]
    
    for file in essential_files:
        src = os.path.join(source_profile, file)
        dst = os.path.join(temp_profile, file)
        if os.path.exists(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            temp_profile,
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-first-run',
                '--no-default-browser-check',
            ]
        )
        
        page = await browser.new_page()
        
        try:
            # Go to X
            await page.goto("https://x.com", wait_until="domcontentloaded")
            await asyncio.sleep(3)
            
            # Check if logged in
            is_logged_in = await page.is_visible('[data-testid="SideNav_NewTweet_Button"]')
            
            if not is_logged_in:
                print("Not logged in, attempting manual login...")
                await page.goto("https://x.com/i/flow/login")
                await asyncio.sleep(3)
                
                # Accept cookies if prompted
                cookie_btn = await page.query_selector('button:has-text("Accepter tous les cookies")')
                if cookie_btn:
                    await cookie_btn.click()
                    await asyncio.sleep(1)
                
                # Enter username
                await page.wait_for_selector('input[type="text"]', timeout=10000)
                await page.type('input[type="text"]', "quentinvest1", delay=100)
                await asyncio.sleep(1)
                await page.press('input[type="text"]', 'Enter')
                await asyncio.sleep(2)
                
                # Enter password
                await page.wait_for_selector('input[type="password"]', timeout=10000)
                await page.type('input[type="password"]', "Zidane1010!!", delay=100)
                await asyncio.sleep(1)
                await page.press('input[type="password"]', 'Enter')
                await asyncio.sleep(5)
                
                # Check again
                is_logged_in = await page.is_visible('[data-testid="SideNav_NewTweet_Button"]')
            
            if is_logged_in:
                print("SUCCESS: Logged in!")
                
                # Navigate to compose
                await page.goto("https://x.com/compose/post")
                await asyncio.sleep(2)
                
                # Generate post content
                post_text = "Testing autonomous posting from OpenClaw AI. The future of social media is autonomous. #AI #BuildInPublic #Automation"
                
                # Type post
                await page.fill('[data-testid="tweetTextarea_0"]', post_text)
                await asyncio.sleep(1)
                
                # Click Post button
                await page.click('[data-testid="tweetButton"]')
                await asyncio.sleep(3)
                
                print(f"POSTED: {post_text[:60]}...")
                
                # Save cookies for future
                cookies = await browser.cookies()
                with open('x_cookies.json', 'w') as f:
                    json.dump(cookies, f)
                print("Cookies saved to x_cookies.json")
                
                return True
            else:
                print("FAILED: Could not log in")
                await page.screenshot(path="x_post_fail.png")
                return False
                
        except Exception as e:
            print(f"ERROR: {e}")
            await page.screenshot(path="x_post_error.png")
            return False
            
        finally:
            await asyncio.sleep(2)
            await browser.close()
            # Cleanup
            if os.path.exists(temp_profile):
                shutil.rmtree(temp_profile)

if __name__ == "__main__":
    success = asyncio.run(post_to_x())
    exit(0 if success else 1)
