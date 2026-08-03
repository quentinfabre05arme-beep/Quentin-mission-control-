# OneDrive Library Organization Script - Copy Bodybuilding Books
$oneDrive = [Environment]::GetFolderPath("Personal") -replace "\\Documents", "\OneDrive"

# Find the source folder
$sourceParent = Get-ChildItem "$oneDrive\02-RESSOURCES" -Filter "Formations*" -Directory | Select-Object -First 1
$source = Join-Path $sourceParent.FullName "bodybuilding"

$dest = "$oneDrive\02-RESSOURCES\01-LIBRARY-BODYBUILDING\01-Major-Authors"

Write-Host "Source: $source"
Write-Host "Dest: $dest"

if (Test-Path $source) {
    # Get all author folders
    $authorFolders = Get-ChildItem $source -Directory
    
    foreach ($folder in $authorFolders) {
        $srcPath = $folder.FullName
        $dstPath = Join-Path $dest $folder.Name
        
        # Copy the entire folder
        Copy-Item $srcPath $dest -Recurse -Force
        Write-Host "Copied author: $($folder.Name)"
    }
    
    Write-Host "`n✅ All authors copied!"
} else {
    Write-Host "❌ Source not found: $source"
}
