#!/bin/bash

# Deploy Taxonomy Feature
# Date: January 4, 2026

set -e  # Exit on error

echo "🚀 Starting Taxonomy Feature Deployment"
echo "========================================"
echo ""

# Step 1: Build Server
echo "📦 Step 1: Building server..."
npm run build:server
if [ $? -ne 0 ]; then
    echo "❌ Server build failed!"
    exit 1
fi
echo "✅ Server built successfully"
echo ""

# Step 2: Upload Server
echo "📤 Step 2: Uploading server to api.volxai.com..."
scp -P 2210 dist/server/node-build.mjs \
    jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
if [ $? -ne 0 ]; then
    echo "❌ Server upload failed!"
    exit 1
fi
echo "✅ Server uploaded successfully"
echo ""

# Step 3: Restart Backend
echo "🔄 Step 3: Restarting backend..."
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
    "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
if [ $? -ne 0 ]; then
    echo "❌ Backend restart failed!"
    exit 1
fi
echo "✅ Backend restarted (restart.txt created)"
echo ""

# Step 4: Build Client
echo "📦 Step 4: Building client..."
npm run build:client
if [ $? -ne 0 ]; then
    echo "❌ Client build failed!"
    exit 1
fi
echo "✅ Client built successfully"
echo ""

# Step 5: Upload Client
echo "📤 Step 5: Uploading client to volxai.com..."
rsync -avz -e "ssh -p 2210" dist/spa/ \
    jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ \
    --exclude='.htaccess'
if [ $? -ne 0 ]; then
    echo "❌ Client upload failed!"
    exit 1
fi
echo "✅ Client uploaded successfully"
echo ""

# Step 6: Upload WordPress Plugin
echo "📤 Step 6: Uploading WordPress plugin..."
scp -P 2210 lisa-content-app-plugin/includes/class-api-handler.php \
    jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/wp-content/plugins/article-writer-publisher/includes/
if [ $? -eq 0 ]; then
    echo "✅ Plugin uploaded successfully"
else
    echo "⚠️  Plugin upload failed (may need to do manually)"
fi
echo ""

echo "✅ Deployment completed successfully!"
echo ""
echo "🔍 Next steps:"
echo "  1. Wait 10-20 seconds for backend to restart"
echo "  2. Test at: https://volxai.com/account"
echo "  3. Check console for errors"
echo "  4. Try selecting a website and post type"
echo ""
echo "📝 If taxonomies still don't load:"
echo "  ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com"
echo "  cd ~/api.volxai.com"
echo "  pm2 logs --lines 50"
