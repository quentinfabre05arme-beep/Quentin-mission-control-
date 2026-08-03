# Copy bodybuilding books to library
$oneDrive = $env:OneDrive
$source = Join-Path $oneDrive '02-RESSOURCES\Formations & Bodybuilding\bodybuilding'
$dest = Join-Path $oneDrive '02-RESSOURCES\01-LIBRARY-BODYBUILDING\01-Major-Authors'

Write-Host "Looking for: $source"

if (Test-Path $source) {
    Write-Host "Found source folder!"
    
    # Get all author folders
    $authorFolders = Get-ChildItem $source -Directory -ErrorAction SilentlyContinue
    
    Write-Host "Found $($authorFolders.Count) author folders"
    
    foreach ($folder in $authorFolders) {
        $srcPath = $folder.FullName
        Copy-Item $srcPath $dest -Recurse -Force
        Write-Host "Copied: $($folder.Name)"
    }
    
    Write-Host "`nDone! Copied $($authorFolders.Count) folders"
} else {
    Write-Host "Source not found, trying alternate path..."
    $altPath = Join-Path $oneDrive '02-RESSOURCES'
    $found = Get-ChildItem $altPath -Filter "Formations*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        Write-Host "Found: $($found.FullName)"
    }
}
