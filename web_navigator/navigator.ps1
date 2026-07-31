# Claw Web Navigator
# Unrestricted web automation for research and data extraction

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("research", "extract", "login", "session")]
    $Action,
    
    [string]$Url,
    [string]$Selector,
    [string]$Site,
    [string]$OutputFormat = "json"
)

$SessionsDir = "C:\Users\quent\.openclaw\workspace\web_navigator\sessions"
$OutputDir = "C:\Users\quent\.openclaw\workspace\web_navigator\output"

# Ensure directories exist
if (-not (Test-Path $SessionsDir)) { New-Item -ItemType Directory -Path $SessionsDir -Force | Out-Null }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

function Save-Session {
    param($Site, $Cookies, $Storage)
    $session = @{
        site = $Site
        cookies = $Cookies
        storage = $Storage
        saved_at = Get-Date -Format "o"
    } | ConvertTo-Json -Depth 5
    
    $session | Set-Content "$SessionsDir\${Site}.json"
    Write-Host "Session saved for $Site"
}

function Load-Session {
    param($Site)
    $path = "$SessionsDir\${Site}.json"
    if (Test-Path $path) {
        return Get-Content $path | ConvertFrom-Json
    }
    return $null
}

function Invoke-Research {
    param($Url, $Selector, $OutputFormat)
    
    Write-Host "Researching: $Url"
    
    # Use curl for simple fetching
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
        $html = $response.Content
        
        # Extract text content (simple stripping)
        $text = $html -replace '<[^\u003e]+>', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        
        # Extract title
        $title = if ($html -match '<title\s*\u003e([^\u003c]+)') { $matches[1] } else { "Unknown" }
        
        $result = @{
            url = $Url
            title = $title
            content = $text
            extracted_at = Get-Date -Format "o"
            word_count = ($text -split '\s+').Count
        }
        
        if ($OutputFormat -eq "json") {
            $result | ConvertTo-Json -Depth 3 | Set-Content "$OutputDir\research_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
        }
        
        return $result
    }
    catch {
        Write-Error "Failed to fetch $Url: $_"
        return $null
    }
}

# ═══════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════

switch ($Action) {
    "research" {
        if (-not $Url) { Write-Error "URL required for research"; exit 1 }
        $result = Invoke-Research -Url $Url -Selector $Selector -OutputFormat $OutputFormat
        if ($result) {
            Write-Host "═══════════════════════════════════════"
            Write-Host "  RESEARCH RESULT"
            Write-Host "═══════════════════════════════════════"
            Write-Host "Title: $($result.title)"
            Write-Host "Words: $($result.word_count)"
            Write-Host "Content preview: $($result.content.Substring(0, [Math]::Min(200, $result.content.Length)))..."
            Write-Host "Saved to: $OutputDir"
        }
    }
    
    "extract" {
        Write-Host "Extraction mode - requires browser automation"
        Write-Host "Use browser tool for JavaScript-rendered content"
    }
    
    "login" {
        if (-not $Site) { Write-Error "Site name required"; exit 1 }
        Write-Host "Login session for $Site"
        Write-Host "Manual login required - browser automation will capture session after"
    }
    
    "session" {
        if (-not $Site) { Write-Error "Site name required"; exit 1 }
        $session = Load-Session -Site $Site
        if ($session) {
            Write-Host "Session for $Site:"
            Write-Host "  Saved: $($session.saved_at)"
            Write-Host "  Cookies: $($session.cookies.Count)"
        } else {
            Write-Host "No session found for $Site"
        }
    }
}

Write-Host ""
Write-Host "Web Navigator ready. Use browser tool for full automation."