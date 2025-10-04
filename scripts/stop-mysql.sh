#!/bin/bash

# Script to stop MySQL Docker container for Omni Assistant

echo "🛑 Stopping MySQL Docker container for Omni Assistant..."

# Stop and remove the container
docker-compose down

echo "✅ MySQL container stopped successfully!"
echo ""
echo "💡 To start it again, run: ./scripts/start-mysql.sh"
echo "🗑️  To remove all data, run: docker-compose down -v"
