import asyncio
from playwright.async_api import async_playwright

async def post_to_x():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Navigate to X login
            await page.goto("https://x.com/i/flow/login", wait_until="domcontentloaded")
            await asyncio.sleep(3)
            
            # Step 1: Enter username
            await page.wait_for_selector('input[type="text"]', timeout=10000)
            await page.fill('input[type="text"]', "quentinvest1")
            await asyncio.sleep(1)
            
            # Click Next
            await page.click('button:has-text("Next")')
            await asyncio.sleep(2)
            
            # Step 2: Enter password
            await page.wait_for_selector('input[type="password"]', timeout=10000)
            await page.fill('input[type="password"]', "Zidane1010!!")
            await asyncio.sleep(1)
            
            # Click Log in
            await page.click('button[data-testid="LoginForm_Login_Button"]')
            await asyncio.sleep(5)  # Wait longer for 2FA
            
            # Check if we need 2FA
            if await page.is_visible('input[data-testid="ocfEnterTextTextInput"]') or await page.is_visible('input[name="text"]') :
                print("2FA REQUIRED — check your phone/email for code")
                # Take screenshot to see what X is asking for
                await page.screenshot(path="x_2fa_required.png")
                print("Screenshot saved: x_2fa_required.png")
                print("Enter the 2FA code in the browser, then I'll continue")
                # Wait for user to enter 2FA
                await asyncio.sleep(30)  # Give user time
            
            # Check if we're logged in
            if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                print("Logged in successfully!")
                
                # Navigate to compose
                await page.goto("https://x.com/compose/post")
                await asyncio.sleep(2)
                
                # Type post
                post_text = "Testing autonomous posting from OpenClaw AI. Building the future of autonomous social media. #AI #BuildInPublic"
                await page.fill('[data-testid="tweetTextarea_0"]', post_text)
                await asyncio.sleep(1)
                
                # Click Post
                await page.click('[data-testid="tweetButton"]')
                await asyncio.sleep(3)
                
                print(f"Posted: {post_text[:50]}...")
                
                # Save cookies for future sessions
                cookies = await context.cookies()
                import json
                with open('x_cookies.json', 'w') as f:
                    json.dump(cookies, f)
                print("Cookies saved for future sessions")
                
            else:
                print("Login failed — taking screenshot for debugging")
                await page.screenshot(path="x_login_failed.png")
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_error.png")
            
        finally:
            await asyncio.sleep(5)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
