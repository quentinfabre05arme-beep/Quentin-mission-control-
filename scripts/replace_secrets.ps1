# Script to replace plaintext API keys with SecretRef calls
# Run from workspace root

$files = @(
    "mission_control\backtest_technical.js",
    "mission_control\enhanced_market_service.js",
    "mission_control\enhanced_sentiment.js",
    "mission_control\enhanced_ta_analysis.js",
    "mission_control\market_data_service.js",
    "mission_control\paper_trade_manager.js",
    "mission_control\quick_scan.js",
    "mission_control\refresh_prices.js",
    "mission_control\sentiment_analysis.js",
    "mission_control\swing_scanner.js",
    "mission_control\ta_analysis.js",
    "investment_fund\scripts\fetch_alternative_data.js"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PWD $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        
        # Replace Twelve Data key - both single and double quotes
        $content = $content -replace "'07f9ead31a5c426ea238e71895beeaa1'", "process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api')"
        $content = $content -replace '"07f9ead31a5c426ea238e71895beeaa1"', "process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api')"
        
        # Replace Serper key - both single and double quotes
        $content = $content -replace "'1a32d04a8215dde72b67e554c94409ce580094f3'", "process.env.SERPER_KEY || require('../lib/secret_resolver').getSecret('serper-api')"
        $content = $content -replace '"1a32d04a8215dde72b67e554c94409ce580094f3"', "process.env.SERPER_KEY || require('../lib/secret_resolver').getSecret('serper-api')"
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "Updated: $file" -ForegroundColor Green
    } else {
        Write-Host "Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nDone! All API keys replaced with SecretRef calls." -ForegroundColor Cyan
