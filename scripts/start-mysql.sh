#!/bin/bash

# Script to start MySQL Docker container for Omni Assistant

echo "🚀 Starting MySQL Docker container for Omni Assistant..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing MySQL container..."
docker-compose down 2>/dev/null || true

# Start the MySQL container
echo "🐳 Starting MySQL container..."
docker-compose up -d mysql

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 10

# Check if container is running
if docker-compose ps mysql | grep -q "Up"; then
    echo "✅ MySQL container is running successfully!"
    echo ""
    echo "📋 Connection details:"
    echo "   Host: localhost"
    echo "   Port: 3307"
    echo "   Database: omni_assistant"
    echo "   Username: omni_user"
    echo "   Password: omni_password"
    echo ""
    echo "🔧 You can now start your Spring Boot application."
    echo "   Make sure to set these environment variables:"
    echo "   export DB_USERNAME=omni_user"
    echo "   export DB_PASSWORD=omni_password"
    echo ""
    echo "📊 To view MySQL logs: docker-compose logs -f mysql"
    echo "🛑 To stop MySQL: docker-compose down"
else
    echo "❌ Failed to start MySQL container. Check logs with:"
    echo "   docker-compose logs mysql"
    exit 1
fi
