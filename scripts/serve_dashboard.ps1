# Serve Claw Mission Control dashboard locally
param(
    [int]$Port = 7777
)

$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

# Try Python 3
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}

if ($python) {
    Write-Host "Serving dashboard at http://localhost:$Port/dashboard/" -ForegroundColor Cyan
    & $python.Source -m http.server $Port
} else {
    Write-Host "Python not found. Falling back to Node.js..." -ForegroundColor Yellow
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host "Node.js not found. Cannot serve dashboard." -ForegroundColor Red
        exit 1
    }
    $listener = @"
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = $Port;
const base = '$workspace'.replace(/\\/g, '/');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
http.createServer((req, res) => {
  let file = path.join(base, decodeURIComponent(req.url.split('?')[0]));
  if (file.endsWith('/') || !fs.existsSync(file)) file = path.join(file, 'project_claw_core/dashboard/index.html');
  if (!file.startsWith(base)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('Dashboard at http://localhost:' + port + '/project_claw_core/dashboard/index.html'));
"@
    $tempFile = [System.IO.Path]::GetTempFileName() + ".js"
    Set-Content -Path $tempFile -Value $listener
    & $node.Path $tempFile
}
