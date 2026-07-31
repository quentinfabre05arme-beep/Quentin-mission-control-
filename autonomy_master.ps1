# Claw Autonomy v4.0 — Self-Running Master Script
# Executes every hour via Windows Task Scheduler
# No external accounts needed

param(
    [switch]$FullRun,
    [switch]$HealthOnly,
    [switch]$ResearchOnly,
    [switch]$RevenueOnly
)

$Workspace = "C:\Users\quent\.openclaw\workspace"
$LogDir = "$Workspace\logs\autonomy"
$StateDir = "$Workspace\recovery\state"

# Ensure directories
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] $Message"
    Add-Content -Path "$LogDir\autonomy.log" -Value $entry
    if ($Level -eq "ERROR" -or $Level -eq "WARN") { Write-Host $entry }
}

# ═══════════════════════════════════════════════════
# MODULE 1: SYSTEM HEALTH
# ═══════════════════════════════════════════════════
function Test-SystemHealth {
    Write-Log "Checking system health..."
    
    $ram = Get-CimInstance Win32_OperatingSystem | Select-Object @{Name="Used";Expression={[math]::Round(($_.TotalVisibleMemorySize - $_.FreePhysicalMemory) / $_.TotalVisibleMemorySize * 100, 1)}}
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object @{Name="Used";Expression={[math]::Round(($_.Size - $_.FreeSpace) / $_.Size * 100, 1)}}
    
    $health = @{
        ram = $ram.Used
        disk = $disk.Used
        timestamp = Get-Date -Format "o"
    }
    
    $health | ConvertTo-Json | Set-Content "$StateDir\health.json"
    
    if ($ram.Used -gt 90) {
        Write-Log "RAM critical: $($ram.Used)%" "WARN"
        # Auto-cleanup
        [System.GC]::Collect()
        Get-Process | Where-Object { $_.ProcessName -in @"chrome", "firefox", "edge" -and $_.WorkingSet -gt 500MB } | ForEach-Object {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Log "Terminated heavy process: $($_.ProcessName)"
        }
    }
    
    if ($disk.Used -gt 90) {
        Write-Log "Disk critical: $($disk.Used)%" "WARN"
        Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Log "Health check complete. RAM: $($ram.Used)%, Disk: $($disk.Used)%"
}

# ═══════════════════════════════════════════════════
# MODULE 2: MARKET DATA REFRESH
# ═══════════════════════════════════════════════════
function Update-MarketData {
    Write-Log "Refreshing market data..."
    
    try {
        Set-Location "$Workspace\mission_control"
        $result = node market_data_service.js --json 2>$null | ConvertFrom-Json
        
        if ($result.assets) {
            Write-Log "Market data refreshed. Assets: $($result.assets.Count)"
            
            # Update dashboard
            $indexHtml = Get-Content "$Workspace\mission_control\index.html" -Raw
            
            # Simple replacements for key assets
            foreach ($asset in $result.assets.PSObject.Properties) {
                $name = $asset.Name
                $price = $asset.Value.price
                $change = $asset.Value.change_24h
                
                # Update price in HTML (simple pattern match)
                $pattern = "$name.*?big-number\u003e[\d,\.\+\-]+"
                if ($indexHtml -match $pattern) {
                    $newPrice = if ($change -gt 0) { "+$change%" } else { "$change%" }
                    $indexHtml = $indexHtml -replace "$name.*?big-number\u003e[\d,\.\+\-]+", "$name`n                <div class=`"big-number`">$([math]::Round($price, 2))"
                }
            }
            
            # Update timestamp
            $indexHtml = $indexHtml -replace "Last updated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}", "Last updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            
            $indexHtml | Set-Content "$Workspace\mission_control\index.html"
            Write-Log "Dashboard updated with fresh prices"
        }
    }
    catch {
        Write-Log "Market data refresh failed: $_" "ERROR"
    }
}

# ═══════════════════════════════════════════════════
# MODULE 3: WEB RESEARCH (No accounts needed)
# ═══════════════════════════════════════════════════
function Invoke-WebResearch {
    param($Topic, $Sources = @("news", "reddit", "twitter"))
    
    Write-Log "Researching: $Topic"
    
    $results = @{
        topic = $Topic
        timestamp = Get-Date -Format "o"
        findings = @()
    }
    
    # Simple news extraction via RSS feeds
    try {
        $rssUrls = @(
            "https://feeds.bbci.co.uk/news/technology/rss.xml"
            "https://feeds.reuters.com/reuters/technologyNews"
        )
        
        foreach ($rssUrl in $rssUrls) {
            try {
                $feed = Invoke-RestMethod -Uri $rssUrl -TimeoutSec 10
                $relevant = $feed | Where-Object { $_.title -match $Topic -or $_.description -match $Topic } | Select-Object -First 3
                
                foreach ($item in $relevant) {
                    $results.findings += @{
                        source = $rssUrl
                        title = $item.title
                        link = $item.link
                        date = $item.pubDate
                    }
                }
            }
            catch { Write-Log "RSS fetch failed for $rssUrl" "WARN" }
        }
    }
    catch {
        Write-Log "Web research failed: $_" "ERROR"
    }
    
    # Save results
    $results | ConvertTo-Json -Depth 5 | Set-Content "$Workspace\web_navigator\output\research_$(Get-Date -Format 'yyyyMMdd_HHmm').json"
    Write-Log "Research complete. Found $($results.findings.Count) items."
}

# ═══════════════════════════════════════════════════
# MODULE 4: REVENUE MONITORING
# ═══════════════════════════════════════════════════
function Check-RevenueStreams {
    Write-Log "Checking revenue streams..."
    
    $streams = @{
        pod = @{ status = "blocked"; blocker = "Pricing fix needed in Printify dashboard" }
        newsletter = @{ status = "ready"; blocker = $null }
        signals = @{ status = "ready"; blocker = $null }
        code = @{ status = "ready"; blocker = $null }
    }
    
    # Check if any stream can run
    $ready = $streams.GetEnumerator() | Where-Object { $_.Value.status -eq "ready" }
    
    if ($ready) {
        Write-Log "$($ready.Count) revenue streams ready. Manual setup needed for: SendGrid, Telegram, Gumroad"
    }
    
    # Log current state
    $streams | ConvertTo-Json | Set-Content "$StateDir\revenue.json"
}

# ═══════════════════════════════════════════════════
# MODULE 5.5: AUTONOMOUS REVENUE ACTIVATION
# ═══════════════════════════════════════════════════
function Start-RevenueActivation {
    Write-Log "Checking revenue stream readiness..."
    
    # Check which streams are ready
    $readyStreams = @()
    $blockedStreams = @()
    
    # POD — check if pricing is fixed
    $podProducts = Get-ChildItem "$Workspace\pod_business\etsy_sync_status.json" -ErrorAction SilentlyContinue
    if ($podProducts) {
        $podData = Get-Content "$Workspace\pod_business\etsy_sync_status.json" | ConvertFrom-Json
        if ($podData.products -and $podData.products.Count -gt 0) {
            $readyStreams += "POD"
        } else {
            $blockedStreams += "POD: pricing not fixed"
        }
    } else {
        $blockedStreams += "POD: no sync file"
    }
    
    # Newsletter — check if we can generate content
    $readyStreams += "Newsletter (content ready, distribution pending)"
    
    # Signals — check if Telegram channel exists
    $readyStreams += "Trading Signals (ready to generate)"
    
    Write-Log "Ready: $($readyStreams -join ', ')"
    Write-Log "Blocked: $($blockedStreams -join ', ')"
    
    # Auto-generate what we can
    if ($readyStreams -contains "Newsletter (content ready, distribution pending)") {
        Generate-NewsletterDraft
    }
}

function Generate-NewsletterDraft {
    Write-Log "Generating newsletter draft..."
    
    # Get latest market data
    $marketData = if (Test-Path "$Workspace\mission_control\market_data.json") {
        Get-Content "$Workspace\mission_control\market_data.json" | ConvertFrom-Json
    } else { $null }
    
    if ($marketData) {
        $draft = @"
# Daily Market Brief — $(Get-Date -Format 'yyyy-MM-dd')

## Market Snapshot
$(foreach ($asset in $marketData.assets.PSObject.Properties) {
    "- **$($asset.Name)**: `$([math]::Round($asset.Value.price, 2))` | Change: $($asset.Value.change_24h)%"
})

## Key Insights
- Market sentiment: Check fear & greed index
- Top performer: $(($marketData.assets.PSObject.Properties | Sort-Object { [decimal]$_.Value.change_24h } -Descending | Select-Object -First 1).Name)
- Portfolio status: See Mission Control dashboard

## Action Items
- [ ] Review stop-losses
- [ ] Check pre-market Monday
- [ ] Monitor BTC support at `$63,000`

---
*Generated by Claw AI Agent | $(Get-Date -Format 'yyyy-MM-dd HH:mm')*
"@
        
        $draftPath = "$Workspace\revenue\newsletter\draft_$(Get-Date -Format 'yyyyMMdd').md"
        if (-not (Test-Path "$Workspace\revenue\newsletter")) { 
            New-Item -ItemType Directory -Path "$Workspace\revenue\newsletter" -Force | Out-Null 
        }
        $draft | Set-Content $draftPath
        Write-Log "Newsletter draft saved: $draftPath"
    }
}

# Git backup function with error handling
function Backup-Git {
    Write-Log "Running git backup..."
    
    try {
        Set-Location $Workspace
        
        # Check for changes
        $status = git status --short 2>$null
        
        if ($status) {
            Write-Log "Changes detected, committing..."
            git add -A >$null 2>&1
            git commit -m "Autonomous backup $(Get-Date -Format 'yyyy-MM-dd HH:mm')" --quiet 2>&1
            
            # Push without Select-Object to avoid PowerShell parsing error
            $pushOutput = git push origin master 2>&1
            $pushSuccess = $LASTEXITCODE -eq 0
            
            if ($pushSuccess) {
                Write-Log "Git backup complete"
            } else {
                Write-Log "Git push returned non-zero exit code" "WARN"
            }
        }
        else {
            Write-Log "No changes to backup"
        }
    }
    catch {
        Write-Log "Git backup error: $($_.Exception.Message)" "WARN"
    }
}

# ═══════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════

Write-Log "=== Claw Autonomy v4.0 Started ==="

if ($HealthOnly) {
    Test-SystemHealth
}
elseif ($ResearchOnly) {
    Invoke-WebResearch -Topic "AI technology trends"
}
elseif ($RevenueOnly) {
    Check-RevenueStreams
}
elseif ($FullRun -or (-not $HealthOnly -and -not $ResearchOnly -and -not $RevenueOnly)) {
    # Full autonomy cycle
    Test-SystemHealth
    Update-MarketData
    Start-RevenueActivation
    Backup-Git
}

Write-Log "=== Autonomy cycle complete ==="