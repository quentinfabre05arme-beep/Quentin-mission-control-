@echo off
setlocal EnableDelayedExpansion

set "JSON={\"pageSize\": 100}"
oo connector run "googledrive" --action "files.list" --data "!JSON!" --json
