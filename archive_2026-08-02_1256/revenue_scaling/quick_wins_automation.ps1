<#
.SYNOPSIS
    Quick Wins Automation - Phase 1 Revenue Scaling
    Fixes blockers, launches Gumroad, sets up paywall
.DESCRIPTION
    Automates the "Quick Wins" phase of revenue scaling:
    1. Checks POD status and generates fix instructions
    2. Creates Gumroad product packages
    3. Sets up newsletter paywall landing page
    4. Validates X posting pipeline
.NOTES
    Run as: .\quick_wins_automation.ps1
    Date: 2026-07-24
#>

$ErrorActionPreference = "Stop"
$Workspace = "C:\Users\quent\.openclaw\workspace"
$RevenueDir = "$Workspace\revenue_scaling"

Write-Host "🚀 REVENUE QUICK WINS AUTOMATION" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# ===== 1. POD STATUS CHECK =====
Write-Host "📦 STEP 1: POD Business Status" -ForegroundColor Yellow
$PodDir = "$Workspace\pod_business"
if (Test-Path "$PodDir\check_token.js") {
    Write-Host "  ✅ check_token.js found"
    Write-Host "  ⚠️  ACTION REQUIRED: Manual Printify token refresh"
    Write-Host "     → Go to https://printify.com/ → Account → API Access → Generate token"
    Write-Host "     → Update .env.local with new token"
    Write-Host "     → Run: cd pod_business && node check_token.js"
} else {
    Write-Host "  ❌ POD scripts not found"
}
Write-Host "  💰 Revenue Potential: €1,500-15,000/mo"
Write-Host "  ⏱️  Time to Fix: 5 minutes"
Write-Host ""

# ===== 2. GUMROAD PRODUCT CREATION =====
Write-Host "📦 STEP 2: Gumroad Store Setup" -ForegroundColor Yellow
$GumroadDir = "$RevenueDir\gumroad_products"
New-Item -ItemType Directory -Force -Path $GumroadDir | Out-Null

$Products = @(
    @{
        Name = "Alpha Signals Research Bot"
        Price = 49
        Description = "Node.js trading bot template with composite scoring, technical analysis alerts, and whale movement detection. Includes 11 indicators, sentiment analysis, and daily brief generation."
        Files = @("enhanced_research.js", "market_data_service.js", "alternative_data_fetcher.js")
    },
    @{
        Name = "Crypto Market Scanner"
        Price = 29
        Description = "Python scripts for real-time crypto scanning with RSI, MACD, SMA crossover alerts. Includes webhook notifications and multi-exchange support."
        Files = @("ta_analysis.js", "sentiment_analysis.js")
    },
    @{
        Name = "Mission Control Dashboard"
        Price = 99
        Description = "Professional HTML dashboard template for portfolio tracking, market intelligence, and risk management. Responsive design, dark mode, real-time data integration."
        Files = @("index.html", "portfolio_tracker.html", "mobile_dashboard.html")
    },
    @{
        Name = "X Content Automation Kit"
        Price = 39
        Description = "Complete content pipeline scripts: auto-generate market updates, schedule posts, track engagement. Works with XActions (free, no API fees)."
        Files = @("x_autonomous.js", "x_post_simple.ps1", "x_queue.json")
    }
)

foreach ($Product in $Products) {
    $ProductDir = "$GumroadDir\$($Product.Name -replace ' ', '_')"
    New-Item -ItemType Directory -Force -Path $ProductDir | Out-Null
    
    $Readme = @"
# $($Product.Name)

**Price:** €$($Product.Price)

## Description
$($Product.Description)

## What's Included
$(($Product.Files | ForEach-Object { "- $_" }) -join "`n")

## Quick Start
1. Extract files to your project directory
2. Run `npm install` for Node.js products
3. Configure API keys in .env file
4. Run `node <main_file>` to start

## Support
For questions, reach out via X: @quentinvest1

## License
Personal use license. Not financial advice.
"@
    
    $Readme | Out-File -FilePath "$ProductDir\README.md" -Encoding UTF8
    Write-Host "  ✅ Created: $($Product.Name) (€$($Product.Price))"
}

Write-Host "  📁 Products ready in: $GumroadDir"
Write-Host "  🌐 Next: Create Gumroad account at https://gumroad.com/"
Write-Host "  📤 Upload each product folder with README + source files"
Write-Host "  💰 Revenue Potential: €500-2,000/mo"
Write-Host ""

# ===== 3. NEWSLETTER PAYWALL LANDING PAGE =====
Write-Host "📦 STEP 3: Newsletter Paywall Setup" -ForegroundColor Yellow
$LandingPage = @'<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alpha Signals — Daily Market Intelligence</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e0e0e0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .hero { text-align: center; padding: 80px 20px; }
        .hero h1 { font-size: 3rem; background: linear-gradient(135deg, #00d4aa, #00a8e8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
        .hero p { font-size: 1.25rem; color: #a0a0a0; max-width: 600px; margin: 0 auto 40px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #00d4aa, #00a8e8); color: #0a0a0f; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1.1rem; transition: transform 0.2s; }
        .cta-btn:hover { transform: translateY(-2px); }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; padding: 60px 0; }
        .feature { background: #151520; padding: 30px; border-radius: 12px; border: 1px solid #252535; }
        .feature h3 { color: #00d4aa; margin-bottom: 12px; }
        .feature p { color: #a0a0a0; }
        .pricing { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; padding: 60px 0; }
        .plan { background: #151520; padding: 40px; border-radius: 12px; border: 1px solid #252535; text-align: center; }
        .plan.popular { border-color: #00d4aa; position: relative; }
        .plan.popular::before { content: "MOST POPULAR"; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #00d4aa; color: #0a0a0f; padding: 4px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .plan h3 { font-size: 1.5rem; margin-bottom: 10px; }
        .plan .price { font-size: 3rem; font-weight: 700; color: #00d4aa; margin: 20px 0; }
        .plan .price span { font-size: 1rem; color: #a0a0a0; }
        .plan ul { list-style: none; text-align: left; margin: 30px 0; }
        .plan ul li { padding: 8px 0; border-bottom: 1px solid #252535; }
        .plan ul li::before { content: "✓ "; color: #00d4aa; }
        .footer { text-align: center; padding: 40px; color: #606060; font-size: 0.9rem; }
        .social { margin-top: 20px; }
        .social a { color: #00a8e8; text-decoration: none; margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>Alpha Signals</h1>
            <p>Daily market intelligence for serious investors. Automated research, technical analysis, and whale movement alerts delivered every morning at 8:00 CET.</p>
            <a href="#pricing" class="cta-btn">Start Free →</a>
        </div>
        
        <div class="features">
            <div class="feature">
                <h3>📊 Composite Scoring</h3>
                <p>11 technical indicators + sentiment analysis + on-chain data combined into a single actionable score.</p>
            </div>
            <div class="feature">
                <h3>🐋 Whale Alerts</h3>
                <p>Detect accumulation and distribution patterns before the market moves. High-confidence signals.</p>
            </div>
            <div class="feature">
                <h3>⚡ Real-Time Briefs</h3>
                <p>Market snapshot delivered at market open with key moves, anomalies, and actionable signals.</p>
            </div>
            <div class="feature">
                <h3>📈 Technical Analysis</h3>
                <p>RSI, MACD, SMA/EMA crossovers, Bollinger Bands, Stochastic — all automated, all daily.</p>
            </div>
        </div>
        
        <div class="pricing" id="pricing">
            <div class="plan">
                <h3>Free</h3>
                <div class="price">€0<span>/mo</span></div>
                <ul>
                    <li>3-day delayed briefs</li>
                    <li>Basic market snapshot</li>
                    <li>Fear & Greed index</li>
                    <li>Weekly summary</li>
                </ul>
                <a href="#" class="cta-btn">Subscribe</a>
            </div>
            <div class="plan popular">
                <h3>Premium</h3>
                <div class="price">€9<span>/mo</span></div>
                <ul>
                    <li>Real-time daily briefs</li>
                    <li>Full technical analysis</li>
                    <li>Whale movement alerts</li>
                    <li>Weekly deep-dive report</li>
                    <li>Email + RSS delivery</li>
                </ul>
                <a href="#" class="cta-btn">Get Premium</a>
            </div>
            <div class="plan">
                <h3>Pro</h3>
                <div class="price">€29<span>/mo</span></div>
                <ul>
                    <li>Everything in Premium</li>
                    <li>API access</li>
                    <li>Custom alerts</li>
                    <li>Priority support</li>
                    <li>White-label options</li>
                </ul>
                <a href="#" class="cta-btn">Go Pro</a>
            </div>
        </div>
        
        <div class="footer">
            <p>© 2026 Alpha Signals. Not financial advice. For educational purposes only.</p>
            <div class="social">
                <a href="https://x.com/quentinvest1">X/Twitter</a>
                <a href="https://substack.com/@quentinvest1">Substack</a>
            </div>
        </div>
    </div>
</body>
</html>
'@

$LandingPath = "$RevenueDir\landing_page.html"
$LandingPage | Out-File -FilePath $LandingPath -Encoding UTF8
Write-Host "  ✅ Landing page created: $LandingPath"
Write-Host "  🌐 Deploy to: Vercel (drag & drop) or Netlify"
Write-Host "  💰 Revenue Potential: €500-3,000/mo"
Write-Host ""

# ===== 4. X POSTING VALIDATION =====
Write-Host "📦 STEP 4: X Posting Pipeline Check" -ForegroundColor Yellow
$XQueue = "$Workspace\x_queue.json"
if (Test-Path $XQueue) {
    try {
        $Queue = Get-Content $XQueue | ConvertFrom-Json
        $PendingPosts = ($Queue.posts | Where-Object { $_.status -eq "pending" }).Count
        Write-Host "  ✅ X queue found: $PendingPosts posts pending"
        Write-Host "  📅 Schedule: $($Queue.config.schedule.postTimes -join ', ')"
        Write-Host "  🔄 Status: $($Queue.config.status)"
        
        if ($PendingPosts -lt 7) {
            Write-Host "  ⚠️  WARNING: Only $PendingPosts posts queued. Generate more content."
        }
    } catch {
        Write-Host "  ❌ Error reading X queue: $_"
    }
} else {
    Write-Host "  ❌ X queue not found"
}
Write-Host "  💰 Revenue Potential: €500-2,000/mo (at scale)"
Write-Host ""

# ===== 5. REVENUE TRACKING SETUP =====
Write-Host "📦 STEP 5: Revenue Tracking Dashboard" -ForegroundColor Yellow
$Tracker = @{
    baseline = @{
        date = "2026-07-24"
        total_revenue = 0
        streams = @{
            pod = 0
            alpha_fund = 0
            newsletter = 0
            gumroad = 0
            x_premium = 0
        }
    }
    targets = @{
        week_1 = 500
        month_1 = 2500
        month_3 = 7000
        month_6 = 10300
    }
    weekly_log = @()
}

$Tracker | ConvertTo-Json -Depth 10 | Out-File -FilePath "$RevenueDir\revenue_tracker.json" -Encoding UTF8
Write-Host "  ✅ Revenue tracker created"
Write-Host ""

# ===== SUMMARY =====
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ QUICK WINS SETUP COMPLETE" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT ACTIONS (Manual):" -ForegroundColor Yellow
Write-Host "  1. Fix Printify token → https://printify.com/"
Write-Host "  2. Create Gumroad account → https://gumroad.com/"
Write-Host "  3. Deploy landing page → Vercel/Netlify"
Write-Host "  4. Set up Substack paid tier"
Write-Host "  5. Review and approve X queued posts"
Write-Host ""
Write-Host "AUTOMATED DELIVERABLES:" -ForegroundColor Green
Write-Host "  ✅ Gumroad product packages (4 products)"
Write-Host "  ✅ Newsletter landing page"
Write-Host "  ✅ Revenue tracker dashboard"
Write-Host "  ✅ X pipeline status report"
Write-Host ""
Write-Host "REVENUE POTENTIAL:" -ForegroundColor Cyan
Write-Host "  Week 1: €500-2,000"
Write-Host "  Month 1: €2,500-4,000"
Write-Host "  Month 6: €10,300+"
Write-Host ""
Write-Host "Files created in: $RevenueDir" -ForegroundColor Gray
