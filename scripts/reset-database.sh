#!/bin/bash

# Script to reset MySQL database (removes all data)

echo "⚠️  WARNING: This will delete all data in the MySQL database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Stopping and removing MySQL container with all data..."
    docker-compose down -v
    
    echo "🧹 Removing any remaining volumes..."
    docker volume rm omni-assistant_mysql_data 2>/dev/null || true
    
    echo "🚀 Starting fresh MySQL container..."
    docker-compose up -d mysql
    
    echo "⏳ Waiting for MySQL to be ready..."
    sleep 10
    
    if docker-compose ps mysql | grep -q "Up"; then
        echo "✅ Fresh MySQL container is running!"
        echo "📊 Database has been reset to initial state."
    else
        echo "❌ Failed to start fresh MySQL container."
        exit 1
    fi
else
    echo "❌ Operation cancelled."
fi
