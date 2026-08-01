# RAM Cleanup and Monitoring Script
# Run this to free up RAM and set up automated cleanup

Write-Host "🧹 RAM Cleanup Script"
Write-Host "====================="

# Check current RAM
$ramBefore = Get-WmiObject Win32_OperatingSystem | Select-Object @{Name="FreeGB";Expression={[math]::Round($_.FreePhysicalMemory/1MB, 2)}}, @{Name="TotalGB";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB, 2)}}
Write-Host "Before cleanup: $($ramBefore.FreeGB)GB free / $($ramBefore.TotalGB)GB total"

# Stop unnecessary processes
Write-Host "`nStopping unnecessary processes..."
$processes = @("chrome", "firefox", "teams", "slack", "discord", "spotify")
foreach ($proc in $processes) {
    $running = Get-Process $proc -ErrorAction SilentlyContinue
    if ($running) {
        Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped: $proc"
    }
}

# Clear temp files
Write-Host "`nClearing temp files..."
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  Temp files cleared"

# Clear browser caches
Write-Host "`nClearing browser caches..."
Remove-Item -Path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\Windows\INetCache\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  Browser caches cleared"

# Clear Recycle Bin
Write-Host "`nClearing Recycle Bin..."
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
Write-Host "  Recycle Bin cleared"

# Run memory optimization
Write-Host "`nOptimizing memory..."
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
Write-Host "  Garbage collection complete"

# Check RAM after cleanup
Start-Sleep -Seconds 2
$ramAfter = Get-WmiObject Win32_OperatingSystem | Select-Object @{Name="FreeGB";Expression={[math]::Round($_.FreePhysicalMemory/1MB, 2)}}, @{Name="TotalGB";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB, 2)}}
Write-Host "`nAfter cleanup: $($ramAfter.FreeGB)GB free / $($ramAfter.TotalGB)GB total"
Write-Host "Freed: $([math]::Round($ramAfter.FreeGB - $ramBefore.FreeGB, 2))GB"

Write-Host "`n✅ Cleanup complete!"
