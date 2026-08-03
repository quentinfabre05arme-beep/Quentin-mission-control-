# File Librarian - Google Drive Indexer via oo API
# Lists and indexes all files in Google Drive

param(
    [string]$OutputPath = "$PSScriptRoot\catalog\google_drive_catalog.json",
    [int]$PageSize = 100,
    [switch]$Incremental
)

$ErrorActionPreference = "Continue"

Write-Host "Google Drive Librarian" -ForegroundColor Cyan
Write-Host "Building file index via oo API...`n" -ForegroundColor Gray

# Run oo connector to list files
$runCommand = 'oo connector run "googledrive" --action "files.list" --data ''{"pageSize": 100, "includeItemsFromAllDrives": true}'' --json'

Write-Host "Fetching Google Drive files..." -ForegroundColor Yellow

# Execute and capture output
try {
    $output = Invoke-Expression $runCommand 2>&1
    $result = $output | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($result.files) {
        Write-Host "Found $($result.files.Count) files in Google Drive" -ForegroundColor Green
        
        # Transform oo output to our catalog format
        $catalog = @{
            version = "1.0.0"
            created_at = (Get-Date -Format "o")
            last_updated = (Get-Date -Format "o")
            scan_status = "complete"
            summary = @{
                total_files = $result.files.Count
                total_size_bytes = ($result.files | Measure-Object -Property sizeBytes -Sum).Sum
                total_size_gb = [math]::Round((($result.files | Measure-Object -Property sizeBytes -Sum).Sum / 1GB), 2)
            }
            storage_systems = @{
                google_drive = @{
                    status = "active"
                    last_scan = (Get-Date -Format "o")
                    files = @()
                    statistics = @{
                        total_files = $result.files.Count
                        total_size_bytes = ($result.files | Measure-Object -Property sizeBytes -Sum).Sum
                        by_type = @{}
                    }
                }
            }
            files = @()
        }
        
        # Process each file
        foreach ($file in $result.files) {
            # Determine file type from mimeType
            $fileType = "other"
            switch -Wildcard ($file.mimeType) {
                "application/vnd.google-apps.document" { $fileType = "document" }
                "application/vnd.google-apps.spreadsheet" { $fileType = "spreadsheet" }
                "application/vnd.google-apps.presentation" { $fileType = "presentation" }
                "image/*" { $fileType = "image" }
                "video/*" { $fileType = "video" }
                "audio/*" { $fileType = "audio" }
                "text/*" { $fileType = "text" }
                "application/pdf" { $fileType = "pdf" }
                "application/json" { $fileType = "json" }
                "application/zip*" { $fileType = "archive" }
            }
            
            # Determine category from name/path
            $category = "uncategorized"
            $nameLower = $file.name.ToLower()
            if ($nameLower -match "invest|btc|eth|mstr|hims|crypto|stock|portfolio|trading|fund|analysis") {
                $category = "investment"
            }
            elseif ($nameLower -match "printify|etsy|merch|product|listing|sale|revenue|pod") {
                $category = "pod_business"
            }
            elseif ($nameLower -match "dashboard|mission|automation|claw|agent|research") {
                $category = "mission_control"
            }
            elseif ($nameLower -match "code|script|programming|development") {
                $category = "development"
            }
            
            $fileEntry = @{
                id = $file.id
                name = $file.name
                mimeType = $file.mimeType
                file_type = $fileType
                category = $category
                size_bytes = $file.sizeBytes
                created = $file.createdTime
                modified = $file.modifiedTime
                webViewLink = $file.webViewLink
                shared = $file.shared
                starred = $file.starred
                trashed = $file.trashed
                parents = $file.parents
                owners = $file.owners
            }
            
            $catalog.files += $fileEntry
            
            # Track by type
            if (!$catalog.storage_systems.google_drive.statistics.by_type[$fileType]) {
                $catalog.storage_systems.google_drive.statistics.by_type[$fileType] = 0
            }
            $catalog.storage_systems.google_drive.statistics.by_type[$fileType]++
        }
        
        # Save catalog
        $catalog | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
        
        Write-Host "`n✅ Google Drive catalog saved to: $OutputPath" -ForegroundColor Green
        Write-Host "   Total files: $($catalog.summary.total_files)" -ForegroundColor White
        Write-Host "   Total size: $($catalog.summary.total_size_gb) GB" -ForegroundColor White
        
        # Summary by type
        Write-Host "`n📊 File Types:" -ForegroundColor Cyan
        $catalog.storage_systems.google_drive.statistics.by_type.GetEnumerator() | 
            Sort-Object Value -Descending |
            ForEach-Object {
                Write-Host "   $($_.Key): $($_.Value) files" -ForegroundColor White
            }
        
        exit 0
    }
    else {
        Write-Error "No files returned from Google Drive"
        exit 1
    }
}
catch {
    Write-Error "Failed to fetch Google Drive files: $($_.Exception.Message)"
    exit 1
}
