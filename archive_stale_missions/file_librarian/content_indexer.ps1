# File Librarian - Deep Content Indexer
# Reads file contents and builds semantic index

param(
    [string]$CatalogPath = "$PSScriptRoot\catalog\catalog.json",
    [string]$ContentIndexPath = "$PSScriptRoot\catalog\content_index.json",
    [int]$BatchSize = 50,
    [int]$MaxReadSizeKB = 500,
    [switch]$Incremental,
    [string]$CategoryFilter = $null,
    [string]$TypeFilter = $null
)

$ErrorActionPreference = "Continue"

# Content types that can be read
text_extensions = @('.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.csv', '.html', '.css', '.js', '.ts', '.py', '.ps1', '.sh', '.bat', '.cmd', '.sql', '.log', '.ini', '.conf', '.config')

# Extensions requiring special handling
$docx_extensions = @('.docx')
$pdf_extensions = @('.pdf')

function Get-FileContent($filePath, $extension, $maxSizeKB) {
    try {
        $maxBytes = $maxSizeKB * 1024
        
        if ($extension -in $text_extensions) {
            $content = Get-Content -Path $filePath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($content.Length -gt $maxBytes) {
                $content = $content.Substring(0, $maxBytes) + "... [truncated]"
            }
            return $content
        }
        elseif ($extension -eq '.docx') {
            # Would need external tool for DOCX
            return "[DOCX: Content extraction requires external tool]"
        }
        elseif ($extension -eq '.pdf') {
            # Would need external tool for PDF
            return "[PDF: Content extraction requires external tool]"
        }
        else {
            return "[Binary/Non-readable file type]"
        }
    }
    catch {
        return "[Error reading file: $($_.Exception.Message)]"
    }
}

function Extract-KeyPhrases($content) {
    # Simple keyword extraction
    $words = $content.ToLower() -split '\W+' | Where-Object { $_.Length -gt 3 }
    $wordFreq = $words | Group-Object | Sort-Object Count -Descending | Select-Object -First 10
    return $wordFreq | ForEach-Object { $_.Name }
}

function Extract-Summary($content, $maxLength = 200) {
    $cleanContent = $content -replace '\s+', ' ' -replace '\n+', ' '
    if ($cleanContent.Length -gt $maxLength) {
        return $cleanContent.Substring(0, $maxLength) + "..."
    }
    return $cleanContent
}

function Detect-Topics($content) {
    $topics = @()
    $contentLower = $content.ToLower()
    
    $topicKeywords = @{
        "investment" = @("btc", "eth", "mstr", "hims", "crypto", "stock", "portfolio", "trading", "fund", "analysis", "market", "price")
        "pod_business" = @("printify", "etsy", "merch", "design", "product", "listing", "sale", "revenue")
        "mission_control" = @("dashboard", "automation", "research", "cycle", "claw", "agent", "mission")
        "development" = @("code", "script", "programming", "dev", "tech", "software", "api")
        "data_analysis" = @("data", "analysis", "metrics", "statistics", "chart", "graph", "report")
        "documentation" = @("readme", "guide", "doc", "manual", "instruction", "tutorial")
    }
    
    foreach ($topic in $topicKeywords.Keys) {
        $keywords = $topicKeywords[$topic]
        $matches = $keywords | Where-Object { $contentLower -match $_ }
        if ($matches.Count -ge 2) {
            $topics += $topic
        }
    }
    
    return $topics
}

# Load catalog
Write-Host "Loading catalog from $CatalogPath..." -ForegroundColor Cyan
$catalog = Get-Content $CatalogPath | ConvertFrom-Json

# Load or create content index
$contentIndex = @{}
if (Test-Path $ContentIndexPath) {
    $contentIndex = Get-Content $ContentIndexPath | ConvertFrom-Json -AsHashtable
    Write-Host "Loaded existing content index with $($contentIndex.Count) entries" -ForegroundColor Gray
}

# Filter files to process
$filesToProcess = $catalog.files | Where-Object {
    ($text_extensions -contains $_.extension) -and
    ($_.size_bytes -lt ($MaxReadSizeKB * 1024)) -and
    (!$CategoryFilter -or $_.category -eq $CategoryFilter) -and
    (!$TypeFilter -or $_.file_type -eq $TypeFilter) -and
    (!$Incremental -or !$contentIndex.ContainsKey($_.path))
}

Write-Host "Found $($filesToProcess.Count) files to process" -ForegroundColor Green

# Process in batches
$processed = 0
$batchNumber = 1
$totalBatches = [math]::Ceiling($filesToProcess.Count / $BatchSize)

while ($processed -lt $filesToProcess.Count) {
    $batch = $filesToProcess | Select-Object -Skip $processed -First $BatchSize
    Write-Host "`nProcessing batch $batchNumber of $totalBatches..." -ForegroundColor Yellow
    
    foreach ($file in $batch) {
        Write-Host "  Reading: $($file.name)" -ForegroundColor Gray
        
        $content = Get-FileContent $file.path $file.extension $MaxReadSizeKB
        
        if ($content -and $content -notmatch '^\[.*\]$') {
            $contentIndex[$file.path] = @{
                name = $file.name
                path = $file.path
                relative_path = $file.relative_path
                category = $file.category
                file_type = $file.file_type
                content_summary = Extract-Summary $content
                key_phrases = Extract-KeyPhrases $content
                detected_topics = Detect-Topics $content
                content_hash = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content)).Substring(0, [math]::Min(32, $content.Length))
                indexed_at = (Get-Date -Format "o")
                content_preview = if ($content.Length -gt 500) { $content.Substring(0, 500) } else { $content }
            }
        }
    }
    
    $processed += $batch.Count
    
    # Save progress after each batch
    $contentIndex | ConvertTo-Json -Depth 10 | Out-File $ContentIndexPath -Encoding UTF8
    Write-Host "Progress saved: $processed / $($filesToProcess.Count) files indexed" -ForegroundColor Green
    
    $batchNumber++
}

Write-Host "`n✅ Content indexing complete!" -ForegroundColor Green
Write-Host "   Total indexed: $($contentIndex.Count) files" -ForegroundColor White
Write-Host "   Index saved to: $ContentIndexPath" -ForegroundColor Gray
