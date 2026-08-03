# File Librarian - Natural Language File Finder
# Searches the catalog for files matching natural language queries

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,

    [int]$Limit = 10,
    [switch]$ExactMatch
)

$catalogPath = "$PSScriptRoot\catalog\catalog.json"

if (!(Test-Path $catalogPath)) {
    Write-Error "Catalog not found. Run scan_catalog.ps1 first."
    exit 1
}

$catalog = Get-Content $catalogPath | ConvertFrom-Json

# Search aliases
$aliases = @{
    "mstr" = @("microstrategy", "strategy", "bitcoin treasury")
    "btc" = @("bitcoin", "crypto", "btc")
    "eth" = @("ethereum", "ether")
    "hims" = @("telehealth", "hims", "glp-1")
    "pod" = @("print", "printify", "etsy", "merch", "print-on-demand")
    "dashboard" = @("mission", "control", "hub", "panel")
    "analysis" = @("analysis", "research", "study", "report")
    "code" = @("script", "program", "development", "dev")
}

# Build search terms
$searchTerms = @($Query.ToLower())
foreach ($key in $aliases.Keys) {
    if ($Query -match $key) {
        $searchTerms += $aliases[$key]
    }
}

Write-Host "🔍 Searching for: '$Query'" -ForegroundColor Cyan
Write-Host "   Expanded terms: $($searchTerms -join ', ')" -ForegroundColor Gray

# Score files
$scoredFiles = foreach ($file in $catalog.files) {
    $score = 0
    $matches = @()

    $fileText = "$($file.name) $($file.relative_path) $($file.category)".ToLower()

    foreach ($term in $searchTerms) {
        # Name match (highest weight)
        if ($file.name -match $term) {
            $score += 10
            $matches += "name"
        }

        # Path match
        if ($file.relative_path -match $term) {
            $score += 5
            $matches += "path"
        }

        # Category match
        if ($file.category -match $term) {
            $score += 3
            $matches += "category"
        }

        # Extension match for type searches
        if ($term -in @("document", "spreadsheet", "image", "video", "code") -and $file.file_type -eq $term) {
            $score += 2
            $matches += "type"
        }
    }

    # Recency bonus
    $fileAge = (Get-Date) - [datetime]$file.modified
    if ($fileAge.Days -lt 7) { $score += 2 }
    elseif ($fileAge.Days -lt 30) { $score += 1 }

    if ($score -gt 0) {
        [PSCustomObject]@{
            name = $file.name
            path = $file.path
            relative_path = $file.relative_path
            category = $file.category
            file_type = $file.file_type
            size = $file.size_human
            modified = $file.modified
            score = $score
            match_types = ($matches | Sort-Object -Unique) -join ", "
        }
    }
}

# Sort by score and take top results
$results = $scoredFiles | Sort-Object score -Descending | Select-Object -First $Limit

if ($results.Count -eq 0) {
    Write-Host "`n❌ No files found matching '$Query'" -ForegroundColor Yellow
    Write-Host "   Try different keywords or check the catalog at:" -ForegroundColor Gray
    Write-Host "   $catalogPath" -ForegroundColor Gray
} else {
    Write-Host "`n📁 Found $($results.Count) results:`n" -ForegroundColor Green

    $i = 1
    foreach ($result in $results) {
        Write-Host "$i. $($result.name)" -ForegroundColor White
        Write-Host "   📂 $($result.relative_path)" -ForegroundColor Gray
        Write-Host "   🏷️  Category: $($result.category) | Type: $($result.file_type)" -ForegroundColor Cyan
        Write-Host "   💾 $($result.size) | Modified: $($result.modified)" -ForegroundColor Gray
        Write-Host "   ⭐ Score: $($result.score) [matches: $($result.match_types)]" -ForegroundColor DarkGray
        Write-Host ""
        $i++
    }

    Write-Host "💡 Tip: Use the full path above to access the file directly." -ForegroundColor DarkGray
}

exit 0
