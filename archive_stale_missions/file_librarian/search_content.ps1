# File Librarian - Semantic Content Search
# Searches indexed content for meaning, not just filenames

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,
    
    [string]$ContentIndexPath = "$PSScriptRoot\catalog\content_index.json",
    [int]$Limit = 10,
    [switch]$IncludePreview
)

if (!(Test-Path $ContentIndexPath)) {
    Write-Error "Content index not found. Run content_indexer.ps1 first."
    exit 1
}

Write-Host "🔍 Semantic Search: '$Query'" -ForegroundColor Cyan

$contentIndex = Get-Content $ContentIndexPath | ConvertFrom-Json

$searchTerms = $Query.ToLower() -split '\s+' | Where-Object { $_.Length -gt 2 }

# Score files based on semantic relevance
$scoredFiles = foreach ($file in $contentIndex.PSObject.Properties) {
    $fileData = $file.Value
    $score = 0
    $matchDetails = @()
    
    $searchableText = "$($fileData.name) $($fileData.content_summary) $($fileData.key_phrases -join ' ') $($fileData.detected_topics -join ' ')".ToLower()
    
    foreach ($term in $searchTerms) {
        # Content match (highest weight)
        $contentMatches = ([regex]::Matches($fileData.content_summary, $term, 'IgnoreCase')).Count
        $score += $contentMatches * 10
        if ($contentMatches -gt 0) { $matchDetails += "content:$contentMatches" }
        
        # Key phrases match
        $phraseMatches = ($fileData.key_phrases | Where-Object { $_ -like "*$term*" }).Count
        $score += $phraseMatches * 8
        if ($phraseMatches -gt 0) { $matchDetails += "phrases:$phraseMatches" }
        
        # Topics match
        $topicMatches = ($fileData.detected_topics | Where-Object { $_ -like "*$term*" }).Count
        $score += $topicMatches * 6
        if ($topicMatches -gt 0) { $matchDetails += "topics:$topicMatches" }
        
        # Filename match
        if ($fileData.name -match $term) {
            $score += 5
            $matchDetails += "filename"
        }
        
        # Category match
        if ($fileData.category -match $term) {
            $score += 3
            $matchDetails += "category"
        }
    }
    
    # Recency bonus
    $indexedDaysAgo = (Get-Date) - [datetime]$fileData.indexed_at
    if ($indexedDaysAgo.Days -lt 7) { $score += 2 }
    
    if ($score -gt 0) {
        [PSCustomObject]@{
            name = $fileData.name
            path = $fileData.path
            relative_path = $fileData.relative_path
            category = $fileData.category
            topics = $fileData.detected_topics -join ", "
            key_phrases = ($fileData.key_phrases | Select-Object -First 5) -join ", "
            summary = $fileData.content_summary
            score = $score
            match_details = ($matchDetails | Select-Object -Unique) -join ", "
            preview = if ($IncludePreview) { $fileData.content_preview } else { $null }
        }
    }
}

$results = $scoredFiles | Sort-Object score -Descending | Select-Object -First $Limit

if ($results.Count -eq 0) {
    Write-Host "`n❌ No semantic matches found for '$Query'" -ForegroundColor Yellow
} else {
    Write-Host "`n📄 Found $($results.Count) semantic matches:`n" -ForegroundColor Green
    
    $i = 1
    foreach ($result in $results) {
        Write-Host "$i. $($result.name)" -ForegroundColor White
        Write-Host "   📂 Path: $($result.relative_path)" -ForegroundColor Gray
        Write-Host "   🏷️ Category: $($result.category) | Topics: $($result.topics)" -ForegroundColor Cyan
        Write-Host "   🔑 Keywords: $($result.key_phrases)" -ForegroundColor DarkCyan
        Write-Host "   📝 Summary: $($result.summary)" -ForegroundColor Yellow
        Write-Host "   ⭐ Score: $($result.score) [matches: $($result.match_details)]" -ForegroundColor DarkGray
        
        if ($IncludePreview -and $result.preview) {
            Write-Host "   👁️ Preview:" -ForegroundColor Magenta
            $previewLines = $result.preview -split "`n" | Select-Object -First 3
            foreach ($line in $previewLines) {
                Write-Host "      $line" -ForegroundColor DarkGray
            }
        }
        
        Write-Host ""
        $i++
    }
}

exit 0
