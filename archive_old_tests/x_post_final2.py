import asyncio
from playwright.async_api import async_playwright

async def post_to_x():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        try:
            # Try logging in via the home page (which should redirect to login if not authenticated)
            await page.goto("https://x.com", wait_until="domcontentloaded")
            await asyncio.sleep(3)
            
            # If we're on the login page, there should be a "Sign in" link
            signin_links = await page.query_selector_all('a, button')
            for link in signin_links:
                text = await link.inner_text()
                if text and 'sign in' in text.lower() or 'se connecter' in text.lower() or 'log in' in text.lower():
                    print(f"Found sign in link: '{text}'")
                    await link.click()
                    await asyncio.sleep(2)
                    break
            
            # Now we should be on the login flow
            await asyncio.sleep(3)
            
            # Accept cookies if prompted
            cookie_buttons = await page.query_selector_all('button')
            for btn in cookie_buttons:
                text = await btn.inner_text()
                if text and 'accepter' in text.lower() and 'cookies' in text.lower():
                    await btn.click()
                    print("Accepted cookies")
                    await asyncio.sleep(1)
                    break
            
            # Look for the username input in the login flow
            await page.wait_for_selector('input[type="text"], input[name="text"], input[autocomplete="username"]', timeout=10000)
            await page.fill('input[type="text"]', "quentinvest1")
            await asyncio.sleep(1)
            
            # Press Enter or click next
            await page.press('input[type="text"]', 'Enter')
            await asyncio.sleep(3)
            
            # Enter password
            await page.wait_for_selector('input[type="password"]', timeout=10000)
            await page.fill('input[type="password"]', "Zidane1010!!")
            await asyncio.sleep(1)
            
            # Press Enter or click login
            await page.press('input[type="password"]', 'Enter')
            await asyncio.sleep(5)
            
            # Check if logged in
            if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                print("SUCCESS: Logged in!")
                
                # Post
                await page.goto("https://x.com/compose/post")
                await asyncio.sleep(2)
                
                post_text = "Testing autonomous posting from OpenClaw AI. The autonomous future is here. #AI #BuildInPublic"
                await page.fill('[data-testid="tweetTextarea_0"]', post_text)
                await asyncio.sleep(1)
                await page.click('[data-testid="tweetButton"]')
                await asyncio.sleep(3)
                
                print(f"Posted: {post_text[:50]}...")
                
                # Save cookies
                cookies = await context.cookies()
                import json
                with open('x_cookies.json', 'w') as f:
                    json.dump(cookies, f)
                print("Cookies saved")
            else:
                print("Login failed — taking screenshot")
                await page.screenshot(path="x_final_login_fail.png")
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_final_error.png")
            
        finally:
            await asyncio.sleep(3)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
