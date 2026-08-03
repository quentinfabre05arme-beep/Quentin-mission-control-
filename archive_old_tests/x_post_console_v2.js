// x_post_console_v2.js - Updated for current X/Twitter layout (July 2026)
// Paste this into Chrome DevTools console on x.com

(async function() {
    const TWEET_TEXT = `Testing automation - will delete`;
    
    console.log('🚀 Starting X post automation...');
    
    // Try multiple selectors for compose button
    const composeSelectors = [
        '[data-testid="SideNav_NewTweet_Button"]',
        '[data-testid="NewTweet_Button"]',
        'a[href="/compose/tweet"]',
        '[aria-label*="Tweet"]',
        '[aria-label*="Compose"]',
        'button[aria-label*="New"]'
    ];
    
    let composeBtn = null;
    for (const selector of composeSelectors) {
        composeBtn = document.querySelector(selector);
        if (composeBtn) {
            console.log('✅ Found compose button:', selector);
            break;
        }
    }
    
    if (!composeBtn) {
        console.error('❌ Compose button not found. Make sure you are on x.com/home');
        console.log('Current URL:', window.location.href);
        return false;
    }
    
    console.log('📝 Clicking compose button...');
    composeBtn.click();
    
    // Wait for modal
    await new Promise(r => setTimeout(r, 2000));
    
    // Try multiple selectors for text input
    const inputSelectors = [
        '[data-testid="tweetTextarea_0"]',
        'div[contenteditable="true"][data-text="true"]',
        'div[contenteditable="true"]',
        '[role="textbox"]'
    ];
    
    let textInput = null;
    for (const selector of inputSelectors) {
        textInput = document.querySelector(selector);
        if (textInput) {
            console.log('✅ Found text input:', selector);
            break;
        }
    }
    
    if (!textInput) {
        console.error('❌ Text input not found');
        return false;
    }
    
    console.log('⌨️ Entering text...');
    textInput.focus();
    textInput.innerHTML = `<span data-text="true">${TWEET_TEXT}</span>`;
    textInput.textContent = TWEET_TEXT;
    
    // Trigger input events
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    textInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Find post button
    const postSelectors = [
        '[data-testid="tweetButton"]',
        '[data-testid="tweetButtonInline"]',
        'button[type="submit"]',
        'button[role="button"]:has(span:contains("Post"))'
    ];
    
    let postBtn = null;
    for (const selector of postSelectors) {
        try {
            postBtn = document.querySelector(selector);
            if (postBtn && !postBtn.disabled) {
                console.log('✅ Found post button:', selector);
                break;
            }
        } catch (e) {}
    }
    
    // Alternative: find button by text content
    if (!postBtn) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.includes('Post') && !btn.disabled) {
                postBtn = btn;
                console.log('✅ Found post button by text');
                break;
            }
        }
    }
    
    if (!postBtn) {
        console.error('❌ Post button not found or disabled');
        console.log('Available buttons:', document.querySelectorAll('button').length);
        return false;
    }
    
    console.log('📤 Clicking post button...');
    postBtn.click();
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('✅ Tweet posted! Check your timeline.');
    return true;
})();
