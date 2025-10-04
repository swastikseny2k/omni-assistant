#!/bin/bash

# Omni Assistant Frontend Startup Script

echo "🚀 Starting Omni Assistant Frontend..."
echo "=================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists, if not create a basic one
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    echo "REACT_APP_API_URL=http://localhost:8080/api" > .env
    echo "NODE_ENV=development" >> .env
fi

echo "🎯 Starting development server..."
echo "📍 Frontend will be available at: http://localhost:3000"
echo "🔗 Make sure your backend is running on: http://localhost:8080"
echo ""

npm start
