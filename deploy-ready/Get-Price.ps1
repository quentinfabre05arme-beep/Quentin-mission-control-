<#
.SYNOPSIS
    Get live market price for any tracked asset
.DESCRIPTION
    Always returns fresh price via multi-source cascade:
    1. Twelve Data API (primary)
    2. CoinGecko (crypto fallback - no key)
    3. Yahoo Finance (stock fallback)
    4. Cached data (last resort)
.PARAMETER Asset
    Asset symbol: BTC, ETH, MSTR, or HIMS
.PARAMETER Refresh
    Force fresh fetch from APIs (ignore cache)
.PARAMETER Json
    Return JSON format
.EXAMPLE
    Get-Price BTC
    Get-Price ETH -Refresh
    Get-Price MSTR -Json
#>
param(
    [Parameter(Mandatory=$false, Position=0)]
    [ValidateSet("BTC", "ETH", "MSTR", "HIMS")]
    [string]$Asset = "BTC",
    
    [switch]$Refresh,
    [switch]$Json
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = "node"

# Build args
$args = @("$scriptDir\get_price.js", $Asset)
if ($Refresh) { $args += "--refresh" }
if ($Json) { $args += "--json" }

# Execute
& $nodePath @args
