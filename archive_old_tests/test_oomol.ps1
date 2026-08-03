# Test OOMOL Connectors Script
# Tests all major connectors and reports results

$results = @()

# Test 1: Gmail
try {
    $output = oo connector run gmail.send_email --data '{"to":"quentin.fabre05arme@gmail.com","subject":"Test","body":"Test"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "Gmail"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "Gmail"; Status = "Failed"; Output = $_.Exception.Message }
}

# Test 2: Calendar
try {
    $output = oo connector run cal.create_schedule --data '{"title":"Test","start_time":"2026-07-27T10:00:00"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "Calendar"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "Calendar"; Status = "Failed"; Output = $_.Exception.Message }
}

# Test 3: Drive
try {
    $output = oo connector run gdrive.search --data '{"query":"test"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "Drive"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "Drive"; Status = "Failed"; Output = $_.Exception.Message }
}

# Test 4: Notion
try {
    $output = oo connector run notion.query_database --data '{"database_id":"test"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "Notion"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "Notion"; Status = "Failed"; Output = $_.Exception.Message }
}

# Test 5: GitHub
try {
    $output = oo connector run github.list_issues --data '{"repo":"quentinvest1/test"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "GitHub"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "GitHub"; Status = "Failed"; Output = $_.Exception.Message }
}

# Test 6: Weather
try {
    $output = oo connector run wttr.in --data '{"location":"Aix-en-Provence"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "Weather"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "Weather"; Status = "Failed"; Output = $_.Exception.Message }
}

# Test 7: OpenAI
try {
    $output = oo connector run openai.create_embeddings --data '{"text":"test"}' --dry-run 2>&1
    $results += [PSCustomObject]@{ Service = "OpenAI"; Status = "Working"; Output = $output }
} catch {
    $results += [PSCustomObject]@{ Service = "OpenAI"; Status = "Failed"; Output = $_.Exception.Message }
}

# Display results
Write-Host ""
Write-Host "OOMOL CONNECTOR TEST RESULTS"
Write-Host "=============================="

foreach ($result in $results) {
    Write-Host "$($result.Service.PadRight(15)) $($result.Status)"
}

Write-Host ""

# Save results
$results | ConvertTo-Json | Out-File -FilePath "C:\Users\quent\.openclaw\workspace\oomol_test_results.json" -Encoding UTF8
Write-Host "Results saved to oomol_test_results.json"
