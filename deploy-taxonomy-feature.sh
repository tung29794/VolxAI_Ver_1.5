#!/bin/bash

# Deploy Taxonomy Feature to Hosting
# Date: January 4, 2026

echo "🚀 Starting deployment of Taxonomy Feature..."
echo ""

# SSH Configuration
SSH_HOST="ghf57-22175.azdigihost.com"
SSH_USER="jybcaorr"
SSH_PORT="2210"
SSH_PASS=";)|o|=NhgnM)"

# Paths
BACKEND_PATH="~/api.volxai.com"
FRONTEND_PATH="~/volxai.com"
PLUGIN_PATH="~/public_html/wp-content/plugins/article-writer-publisher"

echo "📦 Step 1: Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build completed"
echo ""

echo "📤 Step 2: Uploading WordPress Plugin..."
sshpass -p "$SSH_PASS" scp -P $SSH_PORT -r \
    lisa-content-app-plugin/includes/class-api-handler.php \
    $SSH_USER@$SSH_HOST:$PLUGIN_PATH/includes/
if [ $? -eq 0 ]; then
    echo "✅ Plugin uploaded"
else
    echo "⚠️  Plugin upload failed (continuing...)"
fi
echo ""

echo "📤 Step 3: Uploading Backend..."
sshpass -p "$SSH_PASS" scp -P $SSH_PORT -r \
    dist/server/* \
    $SSH_USER@$SSH_HOST:$BACKEND_PATH/dist/server/
if [ $? -ne 0 ]; then
    echo "❌ Backend upload failed!"
    exit 1
fi
echo "✅ Backend uploaded"
echo ""

echo "📤 Step 4: Uploading Frontend..."
sshpass -p "$SSH_PASS" scp -P $SSH_PORT -r \
    dist/spa/* \
    $SSH_USER@$SSH_HOST:$FRONTEND_PATH/
if [ $? -ne 0 ]; then
    echo "❌ Frontend upload failed!"
    exit 1
fi
echo "✅ Frontend uploaded"
echo ""

echo "🔄 Step 5: Restarting Backend..."
sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SSH_HOST << 'ENDSSH'
cd ~/api.volxai.com
pm2 restart volxai-backend || pm2 start dist/server/node-build.mjs --name volxai-backend
pm2 save
ENDSSH

if [ $? -eq 0 ]; then
    echo "✅ Backend restarted"
else
    echo "⚠️  Backend restart may have failed"
fi
echo ""

echo "✅ Deployment completed!"
echo ""
echo "🔍 Testing endpoints:"
echo "  - Backend: https://api.volxai.com/api/websites/:id/taxonomies?post_type=post"
echo "  - Frontend: https://volxai.com/account"
echo ""
echo "📝 Next steps:"
echo "  1. Test the taxonomy selection feature"
echo "  2. Check browser console for any errors"
echo "  3. Verify WordPress plugin is active"
