@echo off
REM Refresh market data - fetches fresh prices from all sources

echo Fetching fresh market data...
cd /d "%~dp0"
node -e "const fs=require('fs'); const {fetchAllPrices}=require('./market_data_service'); fetchAllPrices(true).then(d=>{fs.writeFileSync('market_data.json',JSON.stringify(d,null,2)); console.log('\n✓ Updated market_data.json at', new Date().toLocaleString()); console.log('Sources:', [...new Set(Object.values(d.assets).map(a=>a.source))].join(', '));})"
