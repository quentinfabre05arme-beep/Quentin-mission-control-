# File Librarian - Unified Search (OneDrive + Google Drive)
# Searches both storage systems simultaneously

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,
    
    [int]$Limit = 10,
    [switch]$IncludeGDrive,
    [switch]$IncludeOneDrive,
    [switch]$SemanticSearch
)

$ErrorActionPreference = "Continue"

Write-Host "Unified File Search" -ForegroundColor Cyan
Write-Host "Query: '$Query'`n" -ForegroundColor Gray

$results = @()

# Search OneDrive (if requested or default)
if (!$IncludeGDrive -or $IncludeOneDrive) {
    Write-Host "Searching OneDrive..." -ForegroundColor Yellow
    
    $oneDriveCatalog = "$PSScriptRoot\catalog\catalog.json"
    $oneDriveContent = "$PSScriptRoot\catalog\content_index.json"
    
    if (Test-Path $oneDriveCatalog) {
        $catalog = Get-Content $oneDriveCatalog | ConvertFrom-Json
        $queryLower = $Query.ToLower()
        
        # Search in catalog
        $matches = $catalog.files | Where-Object {
            $_.name -like "*$queryLower*" -or
            $_.relative_path -like "*$queryLower*" -or
            $_.category -like "*$queryLower*"
        } | Select-Object -First $Limit
        
        foreach ($match in $matches) {
            $results += [PSCustomObject]@{
                source = "OneDrive"
                name = $match.name
                path = $match.path
                relative_path = $match.relative_path
                category = $match.category
                file_type = $match.file_type
                size = if ($match.size_human) { $match.size_human } else { "$([math]::Round($match.size_bytes / 1KB, 2)) KB" }
                modified = $match.modified
                score = 100
            }
        }
        
        Write-Host "  Found $($matches.Count) matches in OneDrive" -ForegroundColor Green
    }
    else {
        Write-Host "  OneDrive catalog not found" -ForegroundColor Red
    }
}

# Search Google Drive (if requested or default)
if (!$IncludeOneDrive -or $IncludeGDrive) {
    Write-Host "Searching Google Drive..." -ForegroundColor Yellow
    
    $gdriveCatalog = "$PSScriptRoot\catalog\google_drive_catalog.json"
    
    if (Test-Path $gdriveCatalog) {
        $gdrive = Get-Content $gdriveCatalog | ConvertFrom-Json
        $queryLower = $Query.ToLower()
        
        $matches = $gdrive.files | Where-Object {
            $_.name -like "*$queryLower*" -or
            $_.category -like "*$queryLower*"
        } | Select-Object -First $Limit
        
        foreach ($match in $matches) {
            $results += [PSCustomObject]@{
                source = "Google Drive"
                name = $match.name
                path = $match.webViewLink
                relative_path = "Google Drive"
                category = $match.category
                file_type = $match.file_type
                size = if ($match.sizeBytes) { "$([math]::Round($match.sizeBytes / 1KB, 2)) KB" } else { "N/A" }
                modified = $match.modifiedTime
                score = 100
            }
        }
        
        Write-Host "  Found $($matches.Count) matches in Google Drive" -ForegroundColor Green
    }
    else {
        Write-Host "  Google Drive catalog not found" -ForegroundColor Red
    }
}

# Display results
Write-Host "`n📁 Search Results:`n" -ForegroundColor Cyan

if ($results.Count -eq 0) {
    Write-Host "No files found matching '$Query'" -ForegroundColor Yellow
} else {
    $i = 1
    foreach ($result in ($results | Sort-Object source, name)) {
        $icon = if ($result.source -eq "OneDrive") { "💻" } else { "☁️" }
        Write-Host "$i. $icon [$($result.source)] $($result.name)" -ForegroundColor White
        Write-Host "   📂 $($result.relative_path)" -ForegroundColor Gray
        Write-Host "   🏷️ Category: $($result.category) | Type: $($result.file_type)" -ForegroundColor DarkCyan
        Write-Host "   💾 $($result.size) | Modified: $($result.modified)" -ForegroundColor Gray
        
        if ($result.source -eq "Google Drive" -and $result.path) {
            Write-Host "   🔗 $($result.path)" -ForegroundColor Blue
        }
        
        Write-Host ""
        $i++
    }
}

exit 0
