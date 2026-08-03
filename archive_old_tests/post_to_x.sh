#!/bin/bash
# Simple X posting workflow

TOKEN="c02cc9e6ff0cb473defa142e9029c6fbc86cec4879c45c69"
CONTENT="Testing automation system - take 2"

echo "Opening X compose..."
openclaw browser --token "$TOKEN" open https://x.com/compose/tweet --label x_post

sleep 3

echo "Taking screenshot..."
openclaw browser --token "$TOKEN" screenshot x_post

echo "Done! Check screenshot for X compose interface"
