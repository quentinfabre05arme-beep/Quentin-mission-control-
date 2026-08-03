# Autonomy Core Engine - Run Script
# Executes the engine in continuous mode
# This script is called by Windows Task Scheduler every 15 minutes

cd C:\Users\quent\.openclaw\workspace

# Run the engine once (state persists between runs)
node missions\autonomy_core\engine.js

# Exit with the engine's exit code
exit $LASTEXITCODE
