# File Librarian - OneDrive Scanner
# Scans and catalogs all files in OneDrive with metadata extraction

param(
    [string]$OutputPath = "$PSScriptRoot\catalog\catalog.json",
    [switch]$FullScan,
    [int]$SampleSize = 0
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "Continue"

# Configuration
$oneDrivePath = "$env:USERPROFILE\OneDrive"
$categoryMap = @{
    "Development" = "development"
    "Code-Projects" = "development"
    "Investment" = "investment"
    "Business" = "pod_business"
    "Printify" = "pod_business"
    "Etsy" = "pod_business"
    "Mission-Control" = "mission_control"
    "Home" = "personal"
    "Photos" = "personal"
    "Videos" = "personal"
    "Misc" = "personal"
}

$typeMap = @{
    documents = @('.doc', '.docx', '.pdf', '.txt', '.md', '.rtf', '.odt')
    spreadsheets = @('.xls', '.xlsx', '.csv', '.ods')
    presentations = @('.ppt', '.pptx', '.key', '.odp')
    images = @('.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.dng', '.raw', '.cr2', '.nef')
    videos = @('.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv')
    audio = @('.mp3', '.wav', '.aac', '.flac', '.ogg', '.wma', '.m4a')
    code = @('.js', '.ts', '.py', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.ps1', '.sh', '.bat', '.cmd', '.psm1', '.psd1')
    data = @('.db', '.sqlite', '.sql', '.parquet', '.feather')
    archives = @('.zip', '.rar', '.7z', '.tar', '.gz', '.bz2')
}

function Get-FileType($extension) {
    $ext = $extension.ToLower()
    foreach ($type in $typeMap.Keys) {
        if ($ext -in $typeMap[$type]) {
            return $type
        }
    }
    return "other"
}

function Get-Category($path) {
    $normalized = $path.Replace('\', '/').ToLower()
    foreach ($cat in $categoryMap.Keys) {
        if ($normalized -like "*$($cat.ToLower())*") {
            return $categoryMap[$cat]
        }
    }
    return "uncategorized"
}

function Get-ExtensionStats($files) {
    $stats = @{}
    $files | Group-Object Extension | ForEach-Object {
        $ext = if ($_.Name) { $_.Name.ToLower() } else { "(no extension)" }
        $stats[$ext] = $_.Count
    }
    return $stats
}

function Get-FolderStats($files) {
    $files | Group-Object DirectoryName | ForEach-Object {
        [PSCustomObject]@{
            folder = $_.Name
            file_count = $_.Count
        }
    } | Sort-Object file_count -Descending | Select-Object -First 20
}

Write-Host "File Librarian Scanner v1.0" -ForegroundColor Cyan
Write-Host "Scanning: $oneDrivePath`n" -ForegroundColor Gray

# Check if OneDrive exists
if (!(Test-Path $oneDrivePath)) {
    Write-Error "OneDrive path not found: $oneDrivePath"
    exit 1
}

$startTime = Get-Date
Write-Host "Starting scan at $startTime..." -ForegroundColor Yellow

# Scan files
$scanParams = @{
    Path = $oneDrivePath
    Recurse = $true
    File = $true
    ErrorAction = "SilentlyContinue"
}

$files = Get-ChildItem @scanParams | Select-Object FullName, Name, DirectoryName, Extension, Length, LastWriteTime, CreationTime

if ($SampleSize -gt 0) {
    $files = $files | Select-Object -First $SampleSize
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host "`nFound $($files.Count) files in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green

# Process files
Write-Host "Processing file metadata..." -ForegroundColor Yellow

$fileEntries = @()
$processed = 0
$totalSize = 0

foreach ($file in $files) {
    $processed++
    if ($processed % 1000 -eq 0) {
        Write-Progress -Activity "Processing files" -Status "$processed of $($files.Count)" -PercentComplete (($processed / $files.Count) * 100)
    }

    $relPath = $file.FullName.Replace($oneDrivePath, "").TrimStart("\", "/")
    $category = Get-Category $relPath
    $fileType = Get-FileType $file.Extension
    $totalSize += $file.Length

    $fileEntries += [PSCustomObject]@{
        name = $file.Name
        path = $file.FullName
        relative_path = $relPath
        extension = if ($file.Extension) { $file.Extension.ToLower() } else { "" }
        size_bytes = $file.Length
        size_human = if ($file.Length -gt 1GB) { "{0:N2} GB" -f ($file.Length / 1GB) } elseif ($file.Length -gt 1MB) { "{0:N2} MB" -f ($file.Length / 1MB) } elseif ($file.Length -gt 1KB) { "{0:N2} KB" -f ($file.Length / 1KB) } else { "$($file.Length) B" }
        created = $file.CreationTime.ToString("yyyy-MM-ddTHH:mm:ss")
        modified = $file.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss")
        category = $category
        file_type = $fileType
    }
}

Write-Progress -Activity "Processing files" -Completed

# Build catalog
Write-Host "Building catalog..." -ForegroundColor Yellow

$extStats = Get-ExtensionStats $files
$folderStats = Get-FolderStats $files

$catalog = [ordered]@{
    version = "1.0.0"
    created_at = $startTime.ToString("yyyy-MM-ddTHH:mm:ss")
    last_updated = $endTime.ToString("yyyy-MM-ddTHH:mm:ss")
    scan_status = "complete"
    summary = [ordered]@{
        total_files = $files.Count
        total_size_bytes = $totalSize
        total_size_gb = [math]::Round($totalSize / 1GB, 2)
        scan_duration_seconds = [math]::Round($duration, 2)
    }
    storage_systems = [ordered]@{
        onedrive = [ordered]@{
            path = $oneDrivePath
            status = "active"
            last_scan = $endTime.ToString("yyyy-MM-ddTHH:mm:ss")
            statistics = [ordered]@{
                total_files = $files.Count
                total_size_bytes = $totalSize
                by_extension = $extStats
            }
        }
        google_drive = [ordered]@{
            path = "$env:USERPROFILE\Google Drive"
            status = "not_detected"
            note = "Google Drive Desktop not installed"
        }
    }
    categories = [ordered]@{
        investment = ($fileEntries | Where-Object { $_.category -eq "investment" }).Count
        pod_business = ($fileEntries | Where-Object { $_.category -eq "pod_business" }).Count
        mission_control = ($fileEntries | Where-Object { $_.category -eq "mission_control" }).Count
        development = ($fileEntries | Where-Object { $_.category -eq "development" }).Count
        personal = ($fileEntries | Where-Object { $_.category -eq "personal" }).Count
        uncategorized = ($fileEntries | Where-Object { $_.category -eq "uncategorized" }).Count
    }
    file_types = [ordered]@{
        documents = ($fileEntries | Where-Object { $_.file_type -eq "documents" }).Count
        spreadsheets = ($fileEntries | Where-Object { $_.file_type -eq "spreadsheets" }).Count
        presentations = ($fileEntries | Where-Object { $_.file_type -eq "presentations" }).Count
        images = ($fileEntries | Where-Object { $_.file_type -eq "images" }).Count
        videos = ($fileEntries | Where-Object { $_.file_type -eq "videos" }).Count
        audio = ($fileEntries | Where-Object { $_.file_type -eq "audio" }).Count
        code = ($fileEntries | Where-Object { $_.file_type -eq "code" }).Count
        data = ($fileEntries | Where-Object { $_.file_type -eq "data" }).Count
        archives = ($fileEntries | Where-Object { $_.file_type -eq "archives" }).Count
        other = ($fileEntries | Where-Object { $_.file_type -eq "other" }).Count
    }
    top_folders = $folderStats
    recently_modified = $fileEntries | Where-Object { $_.modified -gt (Get-Date).AddDays(-7).ToString("yyyy-MM-dd") } | Select-Object -First 50
    files = $fileEntries
}

# Save catalog
$catalog | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8

Write-Host "`n✅ Catalog saved to: $OutputPath" -ForegroundColor Green
Write-Host "   Files indexed: $($files.Count)" -ForegroundColor Gray
Write-Host "   Total size: $([math]::Round($totalSize / 1GB, 2)) GB" -ForegroundColor Gray
Write-Host "   Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Gray

# Summary output
Write-Host "`n📊 Category Distribution:" -ForegroundColor Cyan
$catalog.categories.GetEnumerator() | Where-Object { $_.Value -gt 0 } | Sort-Object Value -Descending | ForEach-Object {
    $pct = [math]::Round(($_.Value / $files.Count) * 100, 1)
    $pctStr = "$pct`%"
    Write-Host "   $($_.Key): $($_.Value) files ($pctStr)" -ForegroundColor White
}

Write-Host "`n📁 Top 5 Folders by File Count:" -ForegroundColor Cyan
$folderStats | Select-Object -First 5 | ForEach-Object {
    $shortName = if ($_.folder.Length -gt 50) { $_.folder.Substring(0, 50) + "..." } else { $_.folder }
    Write-Host "   $shortName`: $($_.file_count) files" -ForegroundColor White
}

exit 0
