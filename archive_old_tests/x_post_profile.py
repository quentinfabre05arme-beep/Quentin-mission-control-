import asyncio
from playwright.async_api import async_playwright
import os
import shutil

async def post_with_profile():
    # Use a copy of your Chrome profile to avoid locking issues
    source_profile = os.path.expandvars(r"C:\Users\quent\AppData\Local\Google\Chrome\User Data")
    temp_profile = os.path.expandvars(r"C:\Users\quent\AppData\Local\Temp\chrome_profile_copy")
    
    # Copy profile (only Default folder with cookies)
    if os.path.exists(temp_profile):
        shutil.rmtree(temp_profile)
    
    # Copy just the essential files
    os.makedirs(temp_profile, exist_ok=True)
    
    # Files needed for login session
    essential_files = [
        "Default/Cookies",
        "Default/Login Data",
        "Default/Preferences",
        "Local State"
    ]
    
    for file in essential_files:
        src = os.path.join(source_profile, file)
        dst = os.path.join(temp_profile, file)
        if os.path.exists(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            print(f"Copied: {file}")
    
    async with async_playwright() as p:
        # Launch with copied profile
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
            # Navigate to X
            await page.goto("https://x.com", wait_until="domcontentloaded")
            await asyncio.sleep(3)
            
            # Check if logged in
            if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                print("SUCCESS: Already logged in!")
                
                # Navigate to compose
                await page.goto("https://x.com/compose/post")
                await asyncio.sleep(2)
                
                # Type post
                post_text = "Testing autonomous posting from OpenClaw AI. The future of social is autonomous. #AI #BuildInPublic"
                await page.fill('[data-testid="tweetTextarea_0"]', post_text)
                await asyncio.sleep(1)
                
                # Click Post
                await page.click('[data-testid="tweetButton"]')
                await asyncio.sleep(3)
                
                print(f"Posted: {post_text[:50]}...")
                
                # Save cookies for future
                cookies = await browser.cookies()
                import json
                with open('x_cookies.json', 'w') as f:
                    json.dump(cookies, f)
                print("Cookies saved")
                
            else:
                print("Not logged in - checking page content")
                await page.screenshot(path="x_profile_check.png")
                
                # Try to login if not already logged in
                await page.goto("https://x.com/i/flow/login")
                await asyncio.sleep(3)
                
                await page.fill('input[type="text"]', "quentinvest1")
                await asyncio.sleep(1)
                await page.press('input[type="text"]', 'Enter')
                await asyncio.sleep(2)
                
                await page.fill('input[type="password"]', "Zidane1010!!")
                await asyncio.sleep(1)
                await page.press('input[type="password"]', 'Enter')
                await asyncio.sleep(5)
                
                if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                    print("Logged in manually")
                else:
                    print("Login failed")
                    await page.screenshot(path="x_manual_login_fail.png")
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_profile_error.png")
            
        finally:
            await asyncio.sleep(3)
            await browser.close()
            # Cleanup temp profile
            if os.path.exists(temp_profile):
                shutil.rmtree(temp_profile)

if __name__ == "__main__":
    asyncio.run(post_with_profile())
