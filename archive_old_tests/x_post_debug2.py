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
            
            # Debug: Take screenshot to see the page
            await page.screenshot(path="x_debug_login.png")
            print("Screenshot saved: x_debug_login.png")
            
            # Debug: Print all button texts
            buttons = await page.query_selector_all('button')
            print(f"Found {len(buttons)} buttons:")
            for i, btn in enumerate(buttons[:10]):
                text = await btn.inner_text()
                print(f"  Button {i}: '{text}'")
            
            # Step 1: Enter username
            await page.wait_for_selector('input[type="text"]', timeout=10000)
            await page.fill('input[type="text"]', "quentinvest1")
            await asyncio.sleep(1)
            
            # Try clicking by role instead of text
            next_buttons = await page.query_selector_all('button[role="button"]')
            for btn in next_buttons:
                text = await btn.inner_text()
                if any(word in text.lower() for word in ['next', 'suivant', 'continuer', 'continue']):
                    print(f"Clicking button: '{text}'")
                    await btn.click()
                    break
            
            await asyncio.sleep(3)
            
            # Take another screenshot
            await page.screenshot(path="x_debug_after_username.png")
            print("Screenshot saved: x_debug_after_username.png")
            
            # Step 2: Enter password
            try:
                await page.wait_for_selector('input[type="password"]', timeout=10000)
                await page.fill('input[type="password"]', "Zidane1010!!")
                await asyncio.sleep(1)
                
                # Find login button
                login_buttons = await page.query_selector_all('button[role="button"]')
                for btn in login_buttons:
                    text = await btn.inner_text()
                    if any(word in text.lower() for word in ['log in', 'se connecter', 'connexion', 'login']):
                        print(f"Clicking login button: '{text}'")
                        await btn.click()
                        break
                
                await asyncio.sleep(5)
                
            except Exception as e:
                print(f"Password step error: {e}")
            
            # Take screenshot of result
            await page.screenshot(path="x_debug_result.png")
            print("Screenshot saved: x_debug_result.png")
            
            # Check if we're logged in
            if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                print("SUCCESS: Logged in!")
            else:
                print("Login status unclear — check screenshots")
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_debug_error.png")
            
        finally:
            await asyncio.sleep(3)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
