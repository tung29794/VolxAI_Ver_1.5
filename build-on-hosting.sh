#!/bin/bash
# Script để build frontend và backend trên hosting

echo "🚀 Starting Frontend Build..."
cd /home/jybcaorr/public_html

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔨 Building frontend..."
npm run build
FRONTEND_STATUS=$?

echo ""
echo "🚀 Starting Backend Build..."
cd /home/jybcaorr/api.volxai.com

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔨 Building backend..."
npm run build
BACKEND_STATUS=$?

echo ""
echo "════════════════════════════════════"
if [ $FRONTEND_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ]; then
    echo "✅ BUILD SUCCESS!"
    echo "Frontend: ✅"
    echo "Backend: ✅"
else
    echo "❌ BUILD FAILED!"
    [ $FRONTEND_STATUS -ne 0 ] && echo "Frontend: ❌"
    [ $BACKEND_STATUS -ne 0 ] && echo "Backend: ❌"
fi
echo "════════════════════════════════════"
