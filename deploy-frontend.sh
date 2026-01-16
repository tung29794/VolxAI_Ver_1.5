#!/bin/bash

# VolxAI Frontend Deployment Script
# Deploys frontend to production with .htaccess

set -e

echo "🚀 Starting VolxAI Frontend Deployment..."
echo "================================================"

# Build frontend
echo "📦 Building frontend..."
npm run build:client

# Check if build was successful
if [ ! -f "dist/spa/index.html" ]; then
    echo "❌ Build failed - index.html not found"
    exit 1
fi

echo "✅ Build successful"

# Deploy to server
echo "📤 Deploying to production..."
rsync -avz --delete -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:public_html/

# Copy .htaccess separately to ensure it's not deleted
echo "📄 Deploying .htaccess..."
scp -P 2210 .htaccess jybcaorr@ghf57-22175.azdigihost.com:public_html/

# Verify deployment
echo "🔍 Verifying deployment..."
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "ls -lh public_html/index.html public_html/.htaccess"

echo ""
echo "================================================"
echo "✅ Frontend deployed successfully!"
echo "🌐 URL: https://volxai.com"
echo "================================================"
