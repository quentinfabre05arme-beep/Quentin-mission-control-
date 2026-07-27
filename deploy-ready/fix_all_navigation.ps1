# Fix navigation in all HTML files
$navTemplate = @'
        <nav class="main-nav">
            <a href="index.html" class="nav-item{{ACTIVE_DASHBOARD}}">Dashboard</a>
            <a href="trading.html" class="nav-item{{ACTIVE_TRADING}}">Trading</a>
            <a href="markets.html" class="nav-item{{ACTIVE_MARKETS}}">Markets</a>
            <a href="portfolio_tracker.html" class="nav-item{{ACTIVE_PORTFOLIO}}">Portfolio</a>
            <a href="analytics.html" class="nav-item{{ACTIVE_ANALYTICS}}">Analytics</a>
            <a href="mission_control_risk_management.html" class="nav-item{{ACTIVE_RISK}}">Risk</a>
            <a href="ai_intelligence_hub.html" class="nav-item{{ACTIVE_AI}}">AI Hub</a>
            <a href="backtesting_module.html" class="nav-item{{ACTIVE_BACKTEST}}">Backtest</a>
        </nav>
'@

$sidebarTemplate = @'
        <aside class="sidebar">
            <div class="sidebar-section">
                <div class="sidebar-title">Dashboard</div>
                <a href="index.html" class="sub-nav-item{{ACTIVE_MAIN}}">
                    <span>Main</span>
                    <span class="sub-nav-badge">#157</span>
                </a>
                <a href="mobile_dashboard.html" class="sub-nav-item">
                    <span>Mobile</span>
                </a>
                <a href="executive_dashboard.html" class="sub-nav-item">
                    <span>Executive</span>
                </a>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">Trading</div>
                <a href="trading.html" class="sub-nav-item{{ACTIVE_TRADING_POS}}">
                    <span>Positions</span>
                    <span class="sub-nav-badge">9</span>
                </a>
                <a href="portfolio_tracker.html" class="sub-nav-item">
                    <span>Portfolio</span>
                </a>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">Markets</div>
                <a href="markets.html" class="sub-nav-item{{ACTIVE_MARKETS_OVR}}">
                    <span>Overview</span>
                </a>
                <a href="markets.html" class="sub-nav-item">
                    <span>Crypto</span>
                </a>
                <a href="markets.html" class="sub-nav-item">
                    <span>Stocks</span>
                </a>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">Analysis</div>
                <a href="analytics.html" class="sub-nav-item{{ACTIVE_ANALYTICS_OVR}}">
                    <span>Analytics</span>
                </a>
                <a href="backtesting_module.html" class="sub-nav-item">
                    <span>Backtesting</span>
                </a>
                <a href="mission_control_risk_management.html" class="sub-nav-item">
                    <span>Risk Management</span>
                </a>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-title">Intelligence</div>
                <a href="ai_intelligence_hub.html" class="sub-nav-item{{ACTIVE_AI_HUB}}">
                    <span>AI Hub</span>
                </a>
                <a href="news_sentiment_tracker.html" class="sub-nav-item">
                    <span>Sentiment</span>
                </a>
            </div>
        </aside>
'@

$files = Get-ChildItem *.html

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    $content = Get-Content $file.FullName -Raw
    
    # Detect which page this is
    $activeDashboard = ""
    $activeTrading = ""
    $activeMarkets = ""
    $activePortfolio = ""
    $activeAnalytics = ""
    $activeRisk = ""
    $activeAI = ""
    $activeBacktest = ""
    $activeMain = ""
    $activeTradingPos = ""
    $activeMarketsOvr = ""
    $activeAnalyticsOvr = ""
    $activeAIHub = ""
    
    switch ($file.Name) {
        "index.html" { $activeDashboard = " active"; $activeMain = " active" }
        "trading.html" { $activeTrading = " active"; $activeTradingPos = " active" }
        "markets.html" { $activeMarkets = " active"; $activeMarketsOvr = " active" }
        "portfolio_tracker.html" { $activePortfolio = " active" }
        "analytics.html" { $activeAnalytics = " active"; $activeAnalyticsOvr = " active" }
        "mission_control_risk_management.html" { $activeRisk = " active" }
        "ai_intelligence_hub.html" { $activeAI = " active"; $activeAIHub = " active" }
        "backtesting_module.html" { $activeBacktest = " active" }
    }
    
    # Replace navigation
    $newNav = $navTemplate.Replace("{{ACTIVE_DASHBOARD}}", $activeDashboard)
                          .Replace("{{ACTIVE_TRADING}}", $activeTrading)
                          .Replace("{{ACTIVE_MARKETS}}", $activeMarkets)
                          .Replace("{{ACTIVE_PORTFOLIO}}", $activePortfolio)
                          .Replace("{{ACTIVE_ANALYTICS}}", $activeAnalytics)
                          .Replace("{{ACTIVE_RISK}}", $activeRisk)
                          .Replace("{{ACTIVE_AI}}", $activeAI)
                          .Replace("{{ACTIVE_BACKTEST}}", $activeBacktest)
    
    $newSidebar = $sidebarTemplate.Replace("{{ACTIVE_MAIN}}", $activeMain)
                                   .Replace("{{ACTIVE_TRADING_POS}}", $activeTradingPos)
                                   .Replace("{{ACTIVE_MARKETS_OVR}}", $activeMarketsOvr)
                                   .Replace("{{ACTIVE_ANALYTICS_OVR}}", $activeAnalyticsOvr)
                                   .Replace("{{ACTIVE_AI_HUB}}", $activeAIHub)
    
    # Pattern to find and replace main nav
    $navPattern = '<nav class="main-nav">.*?</nav>'
    if ($content -match $navPattern) {
        $content = $content -replace $navPattern, $newNav.Trim()
        Write-Host "  ✓ Main nav fixed"
    }
    
    # Pattern to find and replace sidebar
    $sidebarPattern = '<aside class="sidebar">.*?</aside>'
    if ($content -match $sidebarPattern) {
        $content = $content -replace $sidebarPattern, $newSidebar.Trim()
        Write-Host "  ✓ Sidebar fixed"
    }
    
    # Remove broken links
    $content = $content -replace 'href="trading-positions\.html"', 'href="trading.html"'
    $content = $content -replace 'href="trading-history\.html"', 'href="trading.html"'
    $content = $content -replace 'href="trading-journal\.html"', 'href="trading.html"'
    $content = $content -replace 'href="markets-btc\.html"', 'href="markets.html"'
    $content = $content -replace 'href="markets-eth\.html"', 'href="markets.html"'
    $content = $content -replace 'href="markets-stocks\.html"', 'href="markets.html"'
    $content = $content -replace 'href="markets-signals\.html"', 'href="markets.html"'
    $content = $content -replace 'href="systems-data\.html"', 'href="systems.html"'
    $content = $content -replace 'href="systems-autonomous\.html"', 'href="systems.html"'
    $content = $content -replace 'href="systems-apis\.html"', 'href="systems.html"'
    $content = $content -replace 'href="missions-paused\.html"', 'href="missions.html"'
    $content = $content -replace 'href="missions-longterm\.html"', 'href="missions.html"'
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "  ✓ Saved`n"
}

Write-Host "All files fixed!"
