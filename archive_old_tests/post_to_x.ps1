# X Posting Automation Script
$TOKEN = "c02cc9e6ff0cb473defa142e9029c6fbc86cec4879c45c69"

Write-Host "Opening X compose..." -ForegroundColor Green
openclaw browser --token $TOKEN open https://x.com/compose/tweet --label x_post

Start-Sleep -Seconds 3

Write-Host "Taking screenshot..." -ForegroundColor Green
openclaw browser --token $TOKEN screenshot x_post

Write-Host "Done!" -ForegroundColor Green
