import asyncio
from playwright.async_api import async_playwright

async def post_to_x():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Navigate to X
            await page.goto("https://x.com/login", wait_until="domcontentloaded")
            await asyncio.sleep(3)
            
            # Take screenshot to see what's on the page
            await page.screenshot(path="x_login_page.png")
            print("Screenshot saved: x_login_page.png")
            
            # Try to find username field with multiple selectors
            selectors = [
                'input[autocomplete="username"]',
                'input[name="text"]',
                'input[type="text"]',
                '[data-testid="ocfEnterTextTextInput"]'
            ]
            
            username_field = None
            for selector in selectors:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    username_field = selector
                    print(f"Found username field: {selector}")
                    break
                except:
                    continue
            
            if username_field:
                await page.fill(username_field, "quentinvest1")
                await asyncio.sleep(1)
                
                # Find and click next button
                await page.click('button:has-text("Next")')
                await asyncio.sleep(2)
                
                # Find password field
                await page.wait_for_selector('input[type="password"]', timeout=10000)
                await page.fill('input[type="password"]', "Zidane1010!")
                await asyncio.sleep(1)
                
                # Click login
                await page.click('button[data-testid="LoginForm_Login_Button"]')
                await asyncio.sleep(3)
                
                print("Login attempt complete")
                
                # Take screenshot of result
                await page.screenshot(path="x_after_login.png")
                print("Screenshot saved: x_after_login.png")
            else:
                print("Could not find username field")
                # Print page content for debugging
                content = await page.content()
                print(content[:500])
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_error.png")
            
        finally:
            await asyncio.sleep(3)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
