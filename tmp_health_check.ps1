$os = Get-CimInstance Win32_OperatingSystem
$free = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$total = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$used = $total - $free
$ramPct = [math]::Round($used / $total * 100, 1)
Write-Output "RAM: ${used} / ${total} MB (${ramPct}%)"

$vol = Get-Volume -DriveLetter C
$dUsed = [math]::Round(($vol.Size - $vol.SizeRemaining) / 1GB, 1)
$dTotal = [math]::Round($vol.Size / 1GB, 1)
$diskPct = [math]::Round($dUsed / $dTotal * 100, 1)
Write-Output "C: ${dUsed} / ${dTotal} GB (${diskPct}%)"
