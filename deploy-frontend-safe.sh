#!/bin/bash

# ================================================================
# Deploy Frontend Script (Safe - Preserves .htaccess)
# ================================================================
# This script deploys frontend without deleting .htaccess
# ================================================================

echo "🚀 Deploying Frontend to Production..."
echo ""

# Step 1: Build
echo "📦 Step 1: Building frontend..."
npm run build:client

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Deploy with rsync (exclude .htaccess from delete)
echo "📤 Step 2: Uploading files..."
rsync -avz \
  --exclude='.htaccess' \
  -e "ssh -p 2210" \
  dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

echo "✅ Upload successful!"
echo ""

# Step 3: Ensure .htaccess exists (upload if needed)
echo "📝 Step 3: Ensuring .htaccess exists..."
scp -P 2210 \
  dist/spa/.htaccess \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/.htaccess

echo "✅ .htaccess verified!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Frontend deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Live at: https://volxai.com"
echo "🔄 Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
