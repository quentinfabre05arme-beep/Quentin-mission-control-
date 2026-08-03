// x_post_console.js - Post to X via Browser Console (No dependencies)
// Paste this into Chrome DevTools console on x.com

(function() {
    const TWEET_TEXT = `🧪 Test post from automation system — ignore this`;
    
    async function postTweet(text) {
        console.log('ðŸš€ Starting X post automation...');
        
        // Find the compose button
        const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') || 
                          document.querySelector('a[href="/compose/tweet"]') ||
                          document.querySelector('[aria-label*="Compose"]');
        
        if (!composeBtn) {
            console.error('âŒ Compose button not found');
            return false;
        }
        
        console.log('ðŸ“ Clicking compose button...');
        composeBtn.click();
        
        // Wait for modal to open
        await new Promise(r => setTimeout(r, 1500));
        
        // Find text input
        const textInput = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                         document.querySelector('div[role="textbox"][contenteditable="true"]');
        
        if (!textInput) {
            console.error('âŒ Text input not found');
            return false;
        }
        
        console.log('âŒ¨ï¸ Typing tweet...');
        textInput.focus();
        textInput.innerHTML = text;
        textInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Find post button
        const postBtn = document.querySelector('[data-testid="tweetButton"]') ||
                       document.querySelector('[data-testid="tweetButtonInline"]') ||
                       document.querySelector('button[type="submit"]');
        
        if (!postBtn || postBtn.disabled) {
            console.error('âŒ Post button not found or disabled');
            return false;
        }
        
        console.log('ðŸ“¤ Clicking post button...');
        postBtn.click();
        
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('âœ… Tweet posted successfully!');
        return true;
    }
    
    // Run
    postTweet(TWEET_TEXT).then(success => {
        if (success) {
            console.log('ðŸŽ‰ Success! Check your timeline.');
        } else {
            console.error('âŒ Failed to post tweet');
        }
    });
})();

