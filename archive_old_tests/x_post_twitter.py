import asyncio
from playwright.async_api import async_playwright

async def post_to_x():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Try the old Twitter login URL
            await page.goto("https://twitter.com/login", wait_until="domcontentloaded")
            await asyncio.sleep(3)
            
            await page.screenshot(path="x_twitter_login.png")
            print("Screenshot saved: x_twitter_login.png")
            
            # Look for username field
            username_selectors = [
                'input[name="text"]',
                'input[type="text"]',
                'input[autocomplete="username"]',
                '[data-testid="ocfEnterTextTextInput"]'
            ]
            
            username_field = None
            for selector in username_selectors:
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
                
                # Find and click next
                buttons = await page.query_selector_all('button')
                for btn in buttons:
                    text = await btn.inner_text()
                    if any(word in text.lower() for word in ['next', 'suivant', 'continuer']):
                        print(f"Clicking: {text}")
                        await btn.click()
                        break
                
                await asyncio.sleep(3)
                
                # Look for password field
                password_selectors = [
                    'input[type="password"]',
                    'input[name="password"]'
                ]
                
                password_field = None
                for selector in password_selectors:
                    try:
                        await page.wait_for_selector(selector, timeout=5000)
                        password_field = selector
                        print(f"Found password field: {selector}")
                        break
                    except:
                        continue
                
                if password_field:
                    await page.fill(password_field, "Zidane1010!!")
                    await asyncio.sleep(1)
                    
                    # Find login button
                    buttons = await page.query_selector_all('button')
                    for btn in buttons:
                        text = await btn.inner_text()
                        if any(word in text.lower() for word in ['log in', 'se connecter', 'login']):
                            print(f"Clicking login: {text}")
                            await btn.click()
                            break
                    
                    await asyncio.sleep(5)
                    
                    # Check login status
                    await page.screenshot(path="x_after_login.png")
                    print("Screenshot saved: x_after_login.png")
                    
                    if await page.is_visible('[data-testid="SideNav_NewTweet_Button"]'):
                        print("SUCCESS: Logged in!")
                        
                        # Now try to post
                        await page.goto("https://twitter.com/compose/tweet")
                        await asyncio.sleep(2)
                        
                        post_text = "Testing autonomous posting from OpenClaw AI. The future of social is autonomous. #AI #BuildInPublic"
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
                        print("Not logged in — check x_after_login.png")
                else:
                    print("No password field found")
            else:
                print("No username field found")
                
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="x_error.png")
            
        finally:
            await asyncio.sleep(3)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
