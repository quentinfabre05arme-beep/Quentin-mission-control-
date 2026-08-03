# File Librarian - Comprehensive Content Reading
# Continuously reads all readable files and builds semantic index

param(
    [switch]$StartBackground,
    [int]$FilesPerRun = 100,
    [switch]$ForceFullRebuild
)

$catalogPath = "$PSScriptRoot\catalog\catalog.json"
$contentIndexPath = "$PSScriptRoot\catalog\content_index.json"
$progressPath = "$PSScriptRoot\catalog\indexing_progress.json"

# Text file extensions that can be read
$readableExtensions = @(
    '.txt', '.md', '.markdown',
    '.json', '.xml', '.yaml', '.yml',
    '.csv', '.tsv',
    '.html', '.htm', '.css', '.scss', '.sass',
    '.js', '.ts', '.jsx', '.tsx',
    '.py', '.pyw',
    '.ps1', '.psm1', '.psd1', '.ps1xml',
    '.sh', '.bash', '.zsh',
    '.bat', '.cmd',
    '.sql',
    '.log', '.out',
    '.ini', '.conf', '.config', '.properties',
    '.rst', '.adoc',
    '.code-workspace', '.vscode-settings'
)

# Skip patterns
$skipPatterns = @(
    'node_modules',
    '\.git',
    '\.vs',
    'bin',
    'obj',
    'dist',
    'build',
    '__pycache__',
    '\.cache',
    'temp',
    'tmp'
)

function Should-ReadFile($filePath) {
    foreach ($pattern in $skipPatterns) {
        if ($filePath -match $pattern) {
            return $false
        }
    }
    return $true
}

function Read-FileContent($filePath, $maxBytes = 512000) {
    try {
        $fileInfo = Get-Item $filePath
        
        # Skip if too large
        if ($fileInfo.Length -gt $maxBytes) {
            return @{ success = $false; error = "File too large ($($fileInfo.Length) bytes)"; content = $null }
        }
        
        # Try UTF-8 first
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($content) {
            return @{ success = $true; error = $null; content = $content; encoding = "UTF-8" }
        }
        
        # Try ASCII
        $content = Get-Content -Path $filePath -Raw -Encoding ASCII -ErrorAction SilentlyContinue
        if ($content) {
            return @{ success = $true; error = $null; content = $content; encoding = "ASCII" }
        }
        
        # Try default
        $content = Get-Content -Path $filePath -Raw -ErrorAction SilentlyContinue
        if ($content) {
            return @{ success = $true; error = $null; content = $content; encoding = "Default" }
        }
        
        return @{ success = $false; error = "Could not read file with any encoding"; content = $null }
    }
    catch {
        return @{ success = $false; error = $_.Exception.Message; content = $null }
    }
}

function Extract-Insights($content) {
    # Clean content
    $cleanContent = $content -replace '\s+', ' ' -replace '\n+', ' ' 
    
    # Extract summary (first 300 chars)
    $summary = if ($cleanContent.Length -gt 300) { 
        $cleanContent.Substring(0, 300).Trim() + "..." 
    } else { 
        $cleanContent.Trim() 
    }
    
    # Extract key terms (words longer than 4 chars, frequency > 1)
    $words = $cleanContent.ToLower() -split '\W+' | 
        Where-Object { $_.Length -gt 4 } |
        Group-Object |
        Sort-Object Count -Descending |
        Select-Object -First 15
    
    $keyTerms = $words | ForEach-Object { $_.Name }
    
    # Detect topics
    $topics = @()
    $contentLower = $content.ToLower()
    
    if ($contentLower -match 'btc|bitcoin|eth|ethereum|mstr|hims|crypto|trading|investment|portfolio|stock') {
        $topics += 'investment'
    }
    if ($contentLower -match 'printify|etsy|merch|product|listing|sale|revenue|pod') {
        $topics += 'pod_business'
    }
    if ($contentLower -match 'dashboard|mission|automation|claw|agent|research|cycle') {
        $topics += 'mission_control'
    }
    if ($contentLower -match 'code|script|function|class|module|api|dev|development|programming') {
        $topics += 'development'
    }
    if ($contentLower -match 'data|analysis|metrics|report|chart|statistics|insight') {
        $topics += 'data_analysis'
    }
    if ($contentLower -match 'config|setting|parameter|option|environment') {
        $topics += 'configuration'
    }
    
    return @{
        summary = $summary
        key_terms = $keyTerms
        topics = $topics
        word_count = ($content -split '\s+').Count
    }
}

function Get-FileHash($filePath) {
    try {
        $hash = Get-FileHash -Path $filePath -Algorithm MD5 -ErrorAction SilentlyContinue
        return $hash.Hash
    }
    catch {
        return $null
    }
}

# Main execution
Write-Host "File Librarian - Content Reader v2.0" -ForegroundColor Cyan
Write-Host "Building semantic index of all readable files...`n" -ForegroundColor Gray

# Load catalog
$catalog = Get-Content $catalogPath | ConvertFrom-Json

# Load or initialize content index
$contentIndex = @{}
$indexExists = Test-Path $contentIndexPath
if ($indexExists -and -not $ForceFullRebuild) {
    $existingIndex = Get-Content $contentIndexPath | ConvertFrom-Json -AsHashtable
    if ($existingIndex) {
        $contentIndex = $existingIndex
        Write-Host "Loaded existing index: $($contentIndex.Count) files indexed" -ForegroundColor Gray
    }
}

# Load progress
$progress = @{ last_processed_index = 0; total_indexed = 0 }
if (Test-Path $progressPath) {
    $progress = Get-Content $progressPath | ConvertFrom-Json
}

# Filter readable files
$readableFiles = $catalog.files | Where-Object {
    $readableExtensions -contains $_.extension -and
    (Should-ReadFile $_.path) -and
    (!$contentIndex.ContainsKey($_.path) -or $ForceFullRebuild)
}

Write-Host "Files to process: $($readableFiles.Count)" -ForegroundColor Green
Write-Host "Already indexed: $($contentIndex.Count)" -ForegroundColor Gray

# Process batch
$filesToProcess = $readableFiles | Select-Object -First $FilesPerRun
$processed = 0
$successCount = 0

foreach ($file in $filesToProcess) {
    $processed++
    Write-Progress -Activity "Indexing files" -Status "$processed of $($filesToProcess.Count)" -PercentComplete (($processed / $filesToProcess.Count) * 100)
    
    Write-Host "Reading: $($file.name)" -ForegroundColor DarkGray
    
    $readResult = Read-FileContent $file.path
    
    if ($readResult.success) {
        $insights = Extract-Insights $readResult.content
        $fileHash = Get-FileHash $file.path
        
        $contentIndex[$file.path] = @{
            name = $file.name
            relative_path = $file.relative_path
            category = $file.category
            file_type = $file.file_type
            size_bytes = $file.size_bytes
            last_modified = $file.modified
            indexed_at = (Get-Date -Format "o")
            content_hash = $fileHash
            summary = $insights.summary
            key_terms = $insights.key_terms
            topics = $insights.topics
            word_count = $insights.word_count
            file_encoding = $readResult.encoding
        }
        
        $successCount++
    }
    else {
        Write-Host "  ⚠️ Failed to read: $($readResult.error)" -ForegroundColor Yellow
    }
    
    # Save progress every 10 files
    if ($processed % 10 -eq 0) {
        $contentIndex | ConvertTo-Json -Depth 10 | Out-File $contentIndexPath -Encoding UTF8
        $progress.total_indexed = $contentIndex.Count
        $progress | ConvertTo-Json | Out-File $progressPath -Encoding UTF8
    }
}

Write-Progress -Activity "Indexing files" -Completed

# Final save
$contentIndex | ConvertTo-Json -Depth 10 | Out-File $contentIndexPath -Encoding UTF8
$progress.total_indexed = $contentIndex.Count
$progress | ConvertTo-Json | Out-File $progressPath -Encoding UTF8

Write-Host "`n✅ Batch complete!" -ForegroundColor Green
Write-Host "   Processed: $processed" -ForegroundColor White
Write-Host "   Successfully indexed: $successCount" -ForegroundColor White
Write-Host "   Total in index: $($contentIndex.Count)" -ForegroundColor White
Write-Host "   Remaining to index: $($readableFiles.Count - $processed)" -ForegroundColor Gray

if ($readableFiles.Count -gt $processed) {
    Write-Host "`nNext run will continue from file $processed" -ForegroundColor Cyan
    Write-Host "   Run again with: read_all_content.ps1" -ForegroundColor Gray
}

exit 0
