# x_daily_content_generator.ps1 - Generate daily X post content from research data
# Run this after each research cycle to populate the queue

param(
    [Parameter(Mandatory=$false)]
    [string]$Date = (Get-Date -Format "yyyy-MM-dd")
)

$Config = @{
    QueueFile = "C:\Users\quent\.openclaw\workspace\x_queue.json"
    MarketDataFile = "C:\Users\quent\.openclaw\workspace\mission_control\market_data.json"
    LogFile = "C:\Users\quent\.openclaw\workspace\logs\x_content_gen.log"
    ContentDir = "C:\Users\quent\.openclaw\workspace\content_pipeline\x_posts"
}

function Write-Log($Message, $Level="INFO") {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Entry = "[$Timestamp] [$Level] $Message"
    Write-Host $Entry
    Add-Content -Path $Config.LogFile -Value $Entry -ErrorAction SilentlyContinue
}

# Load market data
function Get-MarketData {
    try {
        $Data = Get-Content $Config.MarketDataFile -Raw | ConvertFrom-Json
        return $Data.assets
    } catch {
        Write-Log "Failed to load market data: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# Generate post content based on market data
function Generate-PostContent {
    param($MarketData, $Pillar, $TimeSlot)
    
    $BTC = $MarketData.BTC
    $ETH = $MarketData.ETH
    $HIMS = $MarketData.HIMS
    $MSTR = $MarketData.MSTR
    $COIN = $MarketData.COIN
    $TSLA = $MarketData.TSLA
    
    switch ($Pillar) {
        "institutional" {
            $Text = @"
🇺🇸 Institutional flows update:

BTC: `$$("{0:N0}" -f $BTC.price) ($(if($BTC.change_24h -gt 0){"+"}else{""})$("{0:N2}" -f $BTC.change_24h)%)
ETH: `$$("{0:N0}" -f $ETH.price) ($(if($ETH.change_24h -gt 0){"+"}else{""})$("{0:N2}" -f $ETH.change_24h)%)

Key observation: $(if($ETH.change_24h -gt $BTC.change_24h){"ETH outperforming BTC — relative strength signal"}else{"BTC leading — risk-off preference"})

$(if($HIMS -and $HIMS.change_24h -gt 2){"HIMS +$("{0:N2}" -f $HIMS.change_24h)% — healthcare showing resilience"}elseif($TSLA -and $TSLA.change_24h -lt -5){"TSLA $("{0:N2}" -f $TSLA.change_24h)% — risk sentiment under pressure"}else{"Market chop continues — patience required"})

#BTC #ETH #Crypto #Markets
"@
        }
        "defi" {
            $Text = @"
💧 Ethereum ecosystem update:

ETH: `$$("{0:N0}" -f $ETH.price) ($(if($ETH.change_24h -gt 0){"+"}else{""})$("{0:N2}" -f $ETH.change_24h)%)

$(if($ETH.change_24h -gt 1){"ETH showing strength. Restaking economy + L2 scaling = compounding network effects."}elseif($ETH.change_24h -lt -2){"ETH under pressure. Good reminder: fundamentals ≠ price action in short term."}else{"ETH consolidating. Accumulation phase continues for patient builders."})

$(if($MSTR -and $MSTR.change_24h -lt -5 -and $ETH.change_24h -gt 0){"While MSTR bleeds $("{0:N2}" -f $MSTR.change_24h)%, ETH holds — divergence worth watching."}else{"Watch ETH/BTC ratio for relative value signals."})

#Ethereum #DeFi #ETH #Restaking
"@
        }
        "narrative" {
            $Text = @"
🎯 Market structure thoughts:

Fear & Greed: 28 (FEAR territory)

$(if($BTC.change_24h -gt 0 -and $ETH.change_24h -gt 0){"Both BTC and ETH green despite fear — divergence = opportunity"}elseif($BTC.change_24h -lt 0 -and $ETH.change_24h -lt 0){"Everything red. This is when convictions get tested."}else{"Mixed signals. Not a conviction environment — it's a risk management environment."})

$(if($TSLA -and $TSLA.change_24h -lt -10){"TSLA $("{0:N2}" -f $TSLA.change_24h)% reminds us: momentum works both ways."}elseif($HIMS -and $HIMS.change_24h -gt 0){"HIMS green while tech bleeds — real businesses separate from narratives."}else{"Range-bound until macro clarity."})

Not advice. Just observation.

#Crypto #BTC #Ethereum #Markets
"@
        }
    }
    
    return $Text.Trim()
}

# Main execution
Write-Log "=== Daily Content Generator Starting ==="
Write-Log "Generating content for $Date"

$MarketData = Get-MarketData
if (-not $MarketData) {
    Write-Log "Cannot proceed without market data" "ERROR"
    exit 1
}

# Define post schedule
$Schedule = @(
    @{ Time="08:00"; Pillar="institutional"; Theme="Institutional/Macro" },
    @{ Time="14:00"; Pillar="defi"; Theme="DeFi/Ecosystem" },
    @{ Time="19:00"; Pillar="narrative"; Theme="Market Structure/Narrative" }
)

# Generate content directory
$DayDir = Join-Path $Config.ContentDir $Date
New-Item -ItemType Directory -Force -Path $DayDir | Out-Null

# Generate posts
$GeneratedPosts = @()
foreach ($Slot in $Schedule) {
    $PostId = "post-$Date-$($Slot.Time.Replace(':',''))"
    $Content = Generate-PostContent -MarketData $MarketData -Pillar $Slot.Pillar -TimeSlot $Slot.Time
    
    $PostObj = @{
        id = $PostId
        text = $Content
        scheduled_time = $Slot.Time
        scheduled_date = $Date
        timezone = "Europe/Paris"
        pillar = $Slot.Theme
        status = "pending"
        character_count = $Content.Length
        created_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
        market_context = @{
            btc_price = $MarketData.BTC.price
            btc_change = $MarketData.BTC.change_24h
            eth_price = $MarketData.ETH.price
            eth_change = $MarketData.ETH.change_24h
        }
    }
    
    $GeneratedPosts += $PostObj
    
    # Save individual post file
    $PostFile = Join-Path $DayDir "$PostId.json"
    $PostObj | ConvertTo-Json -Depth 5 | Set-Content $PostFile
    Write-Log "Generated post: $($PostObj.id) ($($Content.Length) chars)"
}

# Save batch summary
$Summary = @{
    batch_id = "auto-$Date"
    date = $Date
    total_posts = $GeneratedPosts.Count
    created_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
    schedule = @{
        post_01 = "08:00 CET — Institutional/Macro"
        post_02 = "14:00 CET — DeFi/Ecosystem"
        post_03 = "19:00 CET — Market Structure/Narrative"
    }
    output_files = $GeneratedPosts | ForEach-Object { "$($_.id).json" }
}

$SummaryFile = Join-Path $DayDir "batch_summary.json"
$Summary | ConvertTo-Json -Depth 5 | Set-Content $SummaryFile

# Update queue file
if (Test-Path $Config.QueueFile) {
    $Queue = Get-Content $Config.QueueFile -Raw | ConvertFrom-Json
    # Remove old pending posts for this date
    $Queue.posts = @($Queue.posts | Where-Object { $_.scheduled_date -ne $Date -or $_.status -ne "pending" })
    # Add new posts
    $Queue.posts += $GeneratedPosts
    $Queue | ConvertTo-Json -Depth 10 | Set-Content $Config.QueueFile
    Write-Log "Updated queue with $($GeneratedPosts.Count) new posts"
} else {
    $Queue = @{
        posts = $GeneratedPosts
        config = @{
            dailyLimit = 3
            postedToday = 0
            status = "ACTIVE"
            schedule = @{
                timezone = "Europe/Paris"
                postTimes = @("08:00", "14:00", "19:00")
            }
        }
        lastPost = $null
        note = "Auto-generated content pipeline"
    }
    $Queue | ConvertTo-Json -Depth 10 | Set-Content $Config.QueueFile
    Write-Log "Created new queue with $($GeneratedPosts.Count) posts"
}

Write-Log "=== Content Generation Complete ==="
Write-Log "Files saved to: $DayDir"
