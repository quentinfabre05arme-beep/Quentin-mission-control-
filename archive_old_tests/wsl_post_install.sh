#!/bin/bash
# WSL Post-Install Setup Script
# Run this after WSL and Ubuntu are installed

echo "=================================="
echo "WSL Setup - Post Install"
echo "=================================="
echo ""

# Update system
echo "Updating Ubuntu..."
sudo apt update -y

# Install Docker
echo "Installing Docker..."
sudo apt install docker.io -y

# Start Docker
echo "Starting Docker service..."
sudo service docker start

# Add user to docker group
echo "Configuring Docker permissions..."
sudo usermod -aG docker $USER

# Verify Docker
echo ""
echo "Docker version:"
sudo docker --version

# Run Nitter
echo ""
echo "Starting Nitter container..."
sudo docker run -d -p 8788:8080 --name nitter zedeus/nitter:latest

# Wait and verify
echo ""
echo "Waiting for Nitter to start..."
sleep 5

if sudo docker ps | grep -q nitter; then
    echo ""
    echo "✓ Nitter is running on http://localhost:8788"
    echo ""
    echo "Test with: curl http://localhost:8788"
    echo ""
    echo "Setup complete! Return to Windows and run:"
    echo "  python enhanced_research_pipeline.py"
else
    echo "✗ Nitter failed to start. Check logs with:"
    echo "  sudo docker logs nitter"
fi

echo ""
echo "=================================="
echo "Setup Complete"
echo "=================================="
