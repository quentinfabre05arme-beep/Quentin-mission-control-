import asyncio
from playwright.async_api import async_playwright

async def post_to_x():
    async with async_playwright() as p:
        # Connect to the browser you already have open
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:18800")
        context = browser.contexts[0]
        
        # Create a new page for posting
        page = await context.new_page()
        
        try:
            # Navigate to compose
            await page.goto("https://x.com/compose/post", wait_until="networkidle")
            
            # Wait for the compose textarea
            await page.wait_for_selector('[data-testid="tweetTextarea_0"]', timeout=10000)
            
            # Type the post
            post_text = "Testing autonomous posting from OpenClaw AI agent. Building the future of autonomous social media management. #AI #Automation #OpenClaw"
            await page.fill('[data-testid="tweetTextarea_0"]', post_text)
            
            # Wait a moment
            await asyncio.sleep(1)
            
            # Click the Post button
            await page.click('[data-testid="tweetButton"]')
            
            # Wait for confirmation
            await asyncio.sleep(3)
            
            print(f"✅ Posted: {post_text[:50]}...")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            
        finally:
            await page.close()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(post_to_x())
