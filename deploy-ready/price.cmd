@echo off
REM Quick price lookup - Usage: price BTC
REM Available: BTC, ETH, MSTR, HIMS

if "%~1"=="" (
  echo Usage: price [BTC^|ETH^|MSTR^|HIMS]
  echo.
  node "%~dp0market_data_service.js"
  exit /b
)

node "%~dp0get_price.js" %*
