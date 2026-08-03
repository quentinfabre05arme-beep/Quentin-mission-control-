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
            
            # Look for the Next button specifically (not Apple/Google buttons)
            # Try to find by CSS classes or attributes
            next_btn = await page.query_selector('button[type="button"]:not(:has(img))')
            if next_btn:
                text = await next_btn.inner_text()
                print(f"Found button: '{text}'")
                if text and len(text.strip()) > 0 and text.strip().lower() in ['next', 'suivant']:
                    await next_btn.click()
                    print("Clicked Next")
                else:
                    # Try all buttons and find the one with text
                    buttons = await page.query_selector_all('button[type="button"]')
                    for btn in buttons:
                        btn_text = await btn.inner_text()
                        print(f"Button text: '{btn_text}'")
                        if btn_text and btn_text.strip().lower() in ['next', 'suivant', 'continuer']:
                            await btn.click()
                            print(f"Clicked: {btn_text}")
                            break
            
            await asyncio.sleep(3)
            
            # Step 2: Enter password
            await page.wait_for_selector('input[type="password"]', timeout=10000)
            await page.fill('input[type="password"]', "Zidane1010!!")
            await asyncio.sleep(1)
            
            # Click Log in
            buttons = await page.query_selector_all('button[type="button"]')
            for btn in buttons:
                btn_text = await btn.inner_text()
                if btn_text and any(word in btn_text.lower() for word in ['log in', 'se connecter', 'login']):
                    await btn.click()
                    print(f"Clicked login: {btn_text}")
                    break
            
            await asyncio.sleep(5)
            
            # Check if logged in
            if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                print("SUCCESS: Logged in!")
                
                # Navigate to compose
                await page.goto("https://x.com/compose/post")
                await asyncio.sleep(2)
                
                # Type post
                post_text = "Testing autonomous posting from OpenClaw AI. Building the autonomous social media future. #AI #BuildInPublic"
                await page.fill('[data-testid="tweetTextarea_0"]', post_text)
                await asyncio.sleep(1)
                
                # Click Post
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
                print("Login failed")
                await page.screenshot(path="x_login_fail.png")
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_error.png")
            
        finally:
            await asyncio.sleep(3)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
