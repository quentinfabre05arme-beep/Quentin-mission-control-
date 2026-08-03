import asyncio
from playwright.async_api import async_playwright

async def post_to_x():
    async with async_playwright() as p:
        # Launch a new browser instance
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Navigate to X login
            await page.goto("https://x.com/login", wait_until="domcontentloaded")
            await asyncio.sleep(2)
            
            # Fill in username
            await page.fill('input[autocomplete="username"]', "quentinvest1")
            await asyncio.sleep(1)
            
            # Click Next
            await page.click('button:has-text("Next")')
            await asyncio.sleep(2)
            
            # Fill in password
            await page.fill('input[name="password"]', "Zidane1010!")
            await asyncio.sleep(1)
            
            # Click Log in
            await page.click('button[data-testid="LoginForm_Login_Button"]')
            await asyncio.sleep(3)
            
            # Check if logged in
            if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                print("Logged in successfully")
                
                # Click compose
                await page.click('[data-testid="SideNav_NewTweet_Button"]')
                await asyncio.sleep(2)
                
                # Type post
                post_text = "Testing autonomous posting from OpenClaw AI agent. Building autonomous social media. #AI #Automation"
                await page.fill('[data-testid="tweetTextarea_0"]', post_text)
                await asyncio.sleep(1)
                
                # Click Post
                await page.click('[data-testid="tweetButton"]')
                await asyncio.sleep(3)
                
                print(f"Posted: {post_text[:50]}...")
            else:
                print("Login failed or 2FA required")
                
        except Exception as e:
            print(f"Error: {e}")
            
        finally:
            await asyncio.sleep(5)  # Keep browser open to see result
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
