# Cancel all blocked TaskFlows
# Run from PowerShell

$ids = @(
    "455b40aa", "e1da394e", "6ec13cee", "1f17ab8f", "1c800358",
    "2353828f", "232f8183", "b8ed1734", "0304a6de", "8edf8275",
    "ff1b19fe", "b7d65531", "85335894", "ff608021", "f8ffdae4",
    "aa78384a", "20ff5532", "8d2d5ac9", "7edd880d", "ac6f7f65",
    "96edbe71", "c96cdb7b", "baf917d0", "0dba6b4f", "1852bd38",
    "391c4570", "01f46f9e", "8821b7e3", "fe99613a", "845e2835",
    "23a32af7", "bcf83eb4", "0e7a1b08", "0905b746", "442b5d78",
    "a9154c03", "1e43de0d", "4c96d724", "50819e65", "e7b2732e",
    "bbf9b7a1", "116ac0fd", "7f83520c", "c60bcfcb", "fc172f23",
    "7a311142", "ea2d2928", "cb43fa02"
)

$cancelled = 0
foreach ($id in $ids) {
    try {
        $result = openclaw tasks flow cancel $id 2>&1
        if ($result -match "cancelled|success") {
            Write-Host "✅ Cancelled: $id" -ForegroundColor Green
            $cancelled++
        } else {
            Write-Host "⚠️ Already cancelled or not found: $id" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed: $id - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Cancelled $cancelled / $($ids.Count) blocked TaskFlows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
