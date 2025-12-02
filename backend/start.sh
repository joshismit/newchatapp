#!/bin/bash

# Start script for NewChatApp Backend

echo "🚀 Starting NewChatApp Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please update .env with your configuration"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "✅ Starting development server..."
npm run dev

