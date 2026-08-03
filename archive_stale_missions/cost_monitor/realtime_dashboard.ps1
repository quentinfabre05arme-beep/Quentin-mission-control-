# Real-Time API Usage Dashboard
# Shows live cost tracking

param(
    [int]$RefreshSeconds = 5,
    [int]$RunForMinutes = 0  # 0 = run until Ctrl+C
)

$startTime = Get-Date
$trackerPath = "C:\Users\quent\.openclaw\workspace\missions\cost_monitor\usage_tracker.js"

function Show-Dashboard {
    Clear-Host
    
    $dashboard = node $trackerPath dashboard | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗"
    Write-Host "║         💰 REAL-TIME API USAGE DASHBOARD                  ║"
    Write-Host "║              $(Get-Date -Format 'HH:mm:ss')                              ║"
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    Write-Host "║ STATUS                                                   ║"
    Write-Host "║  $($dashboard.status.PadRight(50)) ║"
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    Write-Host "║ TODAY'S USAGE                                            ║"
    Write-Host "║  Daily Budget:    `$$($dashboard.dailyBudget)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "║  Spent Today:    `$$($dashboard.todaySpent)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "║  Remaining:       `$$($dashboard.remaining)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "║  Percent Used:    $($dashboard.percentUsed)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    Write-Host "║ OVERALL                                                  ║"
    Write-Host "║  Total Spent:     `$$($dashboard.totalSpent)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "║  Total Requests:   $($dashboard.totalRequests)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "║  Est. Monthly:    `$$($dashboard.estimatedMonthly)" -NoNewline
    Write-Host "".PadRight(30) "║"
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    Write-Host "║ BY MODEL (Top 5)                                       ║"
    
    $topModels = $dashboard.byModel.PSObject.Properties | 
        Sort-Object { $_.Value.cost } -Descending | 
        Select-Object -First 5
    
    foreach ($model in $topModels) {
        $name = $model.Name.Replace("ollama-cloud/", "").PadRight(20)
        $cost = [math]::Round($model.Value.cost, 4).ToString().PadRight(10)
        $requests = $model.Value.requests.ToString().PadRight(8)
        Write-Host "║  $name `$${cost} (${requests} req)" -NoNewline
        Write-Host "".PadRight(3) "║"
    }
    
    Write-Host "╠══════════════════════════════════════════════════════════╣"
    Write-Host "║ COMMANDS                                               ║"
    Write-Host "║  Press Ctrl+C to stop                                  ║"
    Write-Host "║  node usage_tracker.js track [model] [tokens]          ║"
    Write-Host "╚══════════════════════════════════════════════════════════╝"
}

Write-Host "Starting real-time dashboard..."
Write-Host "Refresh every ${RefreshSeconds} seconds"
Write-Host ""

while ($true) {
    Show-Dashboard
    
    # Check if runtime exceeded
    if ($RunForMinutes -gt 0) {
        $elapsed = (Get-Date) - $startTime
        if ($elapsed.TotalMinutes -ge $RunForMinutes) {
            Write-Host "`nRuntime complete. Stopping..."
            break
        }
    }
    
    Start-Sleep -Seconds $RefreshSeconds
}
