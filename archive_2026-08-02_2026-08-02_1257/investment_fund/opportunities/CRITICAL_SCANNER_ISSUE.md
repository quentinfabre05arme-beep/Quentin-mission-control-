# ⚠️ CRITICAL: Scanner Data Quality Issue

## Issue
Scanner is returning **synthetic/hardcoded prices** ($100.00 for AAPL, NVDA, COIN) with **absurd asymmetry scores** (144.7x, 124.7x).

## Root Cause
The asymmetry scanner is using placeholder/synthetic data instead of live market prices.

## Correct Prices (approximate, Jul 21 2026):
- **AAPL:** ~$220-230 (not $100)
- **NVDA:** ~$600-700 (not $100)
- **COIN:** ~$180-200 (not $100)

## Action Required
1. Fix scanner to use live price feed (market_data_service.js or Twelve Data API)
2. Re-run scan with real data
3. Review current queue as INVALID

## Queue Status: INVALID — Do not review until fixed.
