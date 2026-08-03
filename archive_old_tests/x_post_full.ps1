# X Full Automation Script - Working Version
$TOKEN = "c02cc9e6ff0cb473defa142e9029c6fbc86cec4879c45c69"
$CONTENT = $args[0]

if (-not $CONTENT) {
    Write-Host "Usage: .\x_post_full.ps1 'Your tweet content'" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "X Browser Automation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Content: $CONTENT" -ForegroundColor White
Write-Host ""

# Step 1: Open X compose
Write-Host "[1/5] Opening X compose..." -ForegroundColor Yellow
$openResult = openclaw browser --token $TOKEN open https://x.com/compose/tweet --label x_auto 2>&1
Write-Host $openResult

Start-Sleep -Seconds 3

# Step 2: Type content using JavaScript
Write-Host "[2/5] Typing content..." -ForegroundColor Yellow
$jsCode = @"
(function() {
    const editor = document.querySelector('[data-testid="tweetTextarea_0"]') || 
                   document.querySelector('[contenteditable="true"]') ||
                   document.querySelector('div[role="textbox"]');
    if (editor) {
        editor.focus();
        editor.innerHTML = '';
        const textNode = document.createTextNode('$($CONTENT -replace "'", "\\'")');
        editor.appendChild(textNode);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return 'typed';
    }
    return 'not_found';
})()
"@

$typeResult = openclaw browser --token $TOKEN evaluate --fn $jsCode x_auto 2>&1
Write-Host "Type result: $typeResult"

Start-Sleep -Seconds 1

# Step 3: Screenshot before posting
Write-Host "[3/5] Taking pre-post screenshot..." -ForegroundColor Yellow
$ss1 = openclaw browser --token $TOKEN screenshot x_auto 2>&1
Write-Host "Screenshot: $ss1"

# Step 4: Click Post button
Write-Host "[4/5] Clicking Post button..." -ForegroundColor Yellow
$clickCode = @"
(function() {
    const btn = document.querySelector('[data-testid="tweetButtonInline"]') ||
                document.querySelector('[data-testid="tweetButton"]') ||
                Array.from(document.querySelectorAll('button')).find(b => 
                    b.textContent.includes('Post') && !b.disabled);
    if (btn) {
        btn.click();
        return 'clicked';
    }
    return 'not_found';
})()
"@

$clickResult = openclaw browser --token $TOKEN evaluate --fn $clickCode x_auto 2>&1
Write-Host "Click result: $clickResult"

Start-Sleep -Seconds 3

# Step 5: Confirmation screenshot
Write-Host "[5/5] Taking confirmation screenshot..." -ForegroundColor Yellow
$ss2 = openclaw browser --token $TOKEN screenshot x_auto 2>&1
Write-Host "Screenshot: $ss2"

# Cleanup
Write-Host "Closing tab..." -ForegroundColor Gray
openclaw browser --token $TOKEN close x_auto 2>&1 | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "POST COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
