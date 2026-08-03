# File Librarian - Daily Scan Report Generator
# Compares two catalog files and generates a report of changes

param(
    [string]$OldCatalog = "$PSScriptRoot\..\catalog\catalog.json",
    [string]$NewCatalog = "$PSScriptRoot\..\catalog\catalog_new.json",
    [string]$OutputPath = "$PSScriptRoot\..\logs\daily_scan_$(Get-Date -Format 'yyyy-MM-dd').log"
)

$ErrorActionPreference = "Stop"

function Write-Log($Message, $Level = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"
    Write-Host $logLine
    Add-Content -Path $OutputPath -Value $logLine -Encoding UTF8 -ErrorAction SilentlyContinue
}

# Create log file header
$header = @"
================================================================================
FILE LIBRARIAN - DAILY SCAN REPORT
Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
================================================================================

"@
$header | Out-File $OutputPath -Encoding UTF8

Write-Log "Starting daily scan comparison..."

# Check if files exist
if (!(Test-Path $OldCatalog)) {
    Write-Log "Old catalog not found: $OldCatalog" "ERROR"
    exit 1
}

if (!(Test-Path $NewCatalog)) {
    Write-Log "New catalog not found: $NewCatalog" "ERROR"
    exit 1
}

# Load catalogs
Write-Log "Loading catalogs..."
$oldData = Get-Content $OldCatalog -Raw | ConvertFrom-Json
$newData = Get-Content $NewCatalog -Raw | ConvertFrom-Json

# Extract key metrics
$oldCount = $oldData.summary.total_files
$newCount = $newData.summary.total_files
$oldSize = $oldData.summary.total_size_bytes
$newSize = $newData.summary.total_size_bytes
$oldScanTime = $oldData.storage_systems.onedrive.last_scan
$newScanTime = $newData.storage_systems.onedrive.last_scan

# Calculate changes
$fileDiff = $newCount - $oldCount
$sizeDiff = $newSize - $oldSize
$sizeDiffGB = [math]::Round($sizeDiff / 1GB, 4)

Write-Log "Old scan: $oldScanTime ($oldCount files, $([math]::Round($oldSize/1GB,2)) GB)"
Write-Log "New scan: $newScanTime ($newCount files, $([math]::Round($newSize/1GB,2)) GB)"

# Summary section
"`n=== SUMMARY ===" | Add-Content $OutputPath
Write-Log "File count change: $fileDiff files"
Write-Log "Storage change: $sizeDiffGB GB"

# Category comparison
"`n=== CATEGORY CHANGES ===" | Add-Content $OutputPath
$categories = @("investment", "pod_business", "mission_control", "development", "personal", "uncategorized")
foreach ($cat in $categories) {
    $oldVal = $oldData.categories.$cat
    $newVal = $newData.categories.$cat
    $diff = $newVal - $oldVal
    if ($diff -ne 0) {
        $sign = if ($diff -gt 0) { "+" } else { "" }
        Write-Log "$cat`: $oldVal -> $newVal ($sign$diff)"
    }
}

# File type comparison
"`n=== FILE TYPE CHANGES ===" | Add-Content $OutputPath
$fileTypes = @("documents", "spreadsheets", "presentations", "images", "videos", "audio", "code", "data", "archives", "other")
foreach ($type in $fileTypes) {
    $oldVal = $oldData.file_types.$type
    $newVal = $newData.file_types.$type
    $diff = $newVal - $oldVal
    if ($diff -ne 0) {
        $sign = if ($diff -gt 0) { "+" } else { "" }
        Write-Log "$type`: $oldVal -> $newVal ($sign$diff)"
    }
}

# Extension changes
"`n=== EXTENSION CHANGES ===" | Add-Content $OutputPath
$oldExts = $oldData.storage_systems.onedrive.statistics.by_extension
$newExts = $newData.storage_systems.onedrive.statistics.by_extension

$extChanges = @()
$newExts.PSObject.Properties | ForEach-Object {
    $ext = $_.Name
    $newCount = $_.Value
    $oldCount = $oldExts.$ext
    if ($oldCount -eq $null) { $oldCount = 0 }
    $diff = $newCount - $oldCount
    if ($diff -ne 0) {
        $extChanges += [PSCustomObject]@{
            Extension = $ext
            OldCount = $oldCount
            NewCount = $newCount
            Change = $diff
        }
    }
}

if ($extChanges.Count -gt 0) {
    $extChanges | Sort-Object Change -Descending | Select-Object -First 10 | ForEach-Object {
        $sign = if ($_.Change -gt 0) { "+" } else { "" }
        Write-Log "$($_.Extension): $($_.OldCount) -> $($_.NewCount) ($sign$($_.Change))"
    }
}

# Status
$status = "NORMAL"
if ($fileDiff -gt 1000) { $status = "LARGE_INFLOW" }
if ($fileDiff -lt -100) { $status = "CLEANUP_DETECTED" }
if ($sizeDiffGB -gt 1) { $status = "LARGE_STORAGE_CHANGE" }

"`n=== SCAN STATUS: $status ===" | Add-Content $OutputPath
Write-Log "Scan complete. Status: $status"

# Replace old catalog with new
Write-Log "Updating catalog..."
Copy-Item $NewCatalog $OldCatalog -Force
Remove-Item $NewCatalog -Force

Write-Log "Daily scan report complete."
exit 0
