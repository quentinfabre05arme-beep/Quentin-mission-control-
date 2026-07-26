# Cleanup script - Remove old dashboard files
Remove-Item -Path "advanced_reporting.html" -ErrorAction SilentlyContinue
Remove-Item -Path "ai_intelligence_hub.html" -ErrorAction SilentlyContinue
Remove-Item -Path "analytics.html" -ErrorAction SilentlyContinue
Remove-Item -Path "backtesting_module.html" -ErrorAction SilentlyContinue
Remove-Item -Path "command_center.html" -ErrorAction SilentlyContinue
Remove-Item -Path "competitor_tracker_app.html" -ErrorAction SilentlyContinue
Remove-Item -Path "executive_dashboard.html" -ErrorAction SilentlyContinue
Remove-Item -Path "hub.html" -ErrorAction SilentlyContinue
Remove-Item -Path "index.html" -ErrorAction SilentlyContinue
Remove-Item -Path "interactive_dashboard.html" -ErrorAction SilentlyContinue
Remove-Item -Path "live_dashboard.html" -ErrorAction SilentlyContinue
Remove-Item -Path "markets.html" -ErrorAction SilentlyContinue
Remove-Item -Path "missions.html" -ErrorAction SilentlyContinue
Remove-Item -Path "mission_control_market_intelligence.html" -ErrorAction SilentlyContinue
Remove-Item -Path "mission_control_portfolio.html" -ErrorAction SilentlyContinue
Remove-Item -Path "mission_control_risk_management.html" -ErrorAction SilentlyContinue
Remove-Item -Path "mobile_dashboard.html" -ErrorAction SilentlyContinue
Remove-Item -Path "news_sentiment_tracker.html" -ErrorAction SilentlyContinue
Remove-Item -Path "portfolio_tracker.html" -ErrorAction SilentlyContinue
Remove-Item -Path "quentin_dashboard.html" -ErrorAction SilentlyContinue
Remove-Item -Path "settings.html" -ErrorAction SilentlyContinue
Remove-Item -Path "social_sentiment_live.html" -ErrorAction SilentlyContinue
Remove-Item -Path "systems.html" -ErrorAction SilentlyContinue
Remove-Item -Path "trading.html" -ErrorAction SilentlyContinue

# Rename v3.html to index.html
Rename-Item -Path "v3.html" -NewName "index.html" -ErrorAction SilentlyContinue

Write-Host "Cleanup complete!"
Write-Host "Remaining files:"
Get-ChildItem *.html
