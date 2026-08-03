/**
 * X Post Automation Script
 * Run this in Chrome DevTools console on x.com/compose/tweet
 */

async function postTweet(text) {
    // Find the contenteditable div
    const textareas = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
    if (textareas.length === 0) {
        console.error('Textarea not found');
        return false;
    }
    
    const textarea = textareas[0];
    
    // Set content
    textarea.innerHTML = text;
    textarea.textContent = text;
    
    // Trigger input event
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
    
    // Wait a moment
    await new Promise(r => setTimeout(r, 1000));
    
    // Find and click post button
    const postButtons = document.querySelectorAll('[data-testid="tweetButton"]');
    for (const btn of postButtons) {
        if (!btn.disabled) {
            btn.click();
            console.log('Tweet posted!');
            return true;
        }
    }
    
    console.error('Post button not found or disabled');
    return false;
}

async function postThread(tweets) {
    for (let i = 0; i < tweets.length; i++) {
        const textarea = document.querySelector(`[data-testid="tweetTextarea_${i}"]`);
        if (!textarea) {
            // Add new tweet
            const addBtn = document.querySelector('[data-testid="addButton"]');
            if (addBtn) addBtn.click();
            await new Promise(r => setTimeout(r, 500));
        }
        
        const currentTextarea = document.querySelector(`[data-testid="tweetTextarea_${i}"]`);
        if (currentTextarea) {
            currentTextarea.innerHTML = tweets[i];
            currentTextarea.textContent = tweets[i];
            const event = new Event('input', { bubbles: true });
            currentTextarea.dispatchEvent(event);
            await new Promise(r => setTimeout(r, 500));
        }
    }
    
    // Click post all
    const postBtn = document.querySelector('[data-testid="tweetButton"]');
    if (postBtn && !postBtn.disabled) {
        postBtn.click();
        console.log('Thread posted!');
        return true;
    }
    
    return false;
}

// Usage:
// await postTweet("Your tweet text here");
// await postThread(["Tweet 1", "Tweet 2", "Tweet 3"]);

console.log('X Post Automation loaded!');
console.log('Usage:');
console.log('  await postTweet("Your text")');
console.log('  await postThread(["Tweet 1", "Tweet 2"])');
