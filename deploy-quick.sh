#!/bin/bash

# Quick Deploy - Taxonomy Feature
# Simplified version for manual deployment

echo "🚀 Deploying Taxonomy Feature to Hosting"
echo ""

# Configuration
HOST="ghf57-22175.azdigihost.com"
USER="jybcaorr"
PORT="2210"

echo "📋 Deployment Steps:"
echo ""
echo "1️⃣  Upload WordPress Plugin:"
echo "   scp -P $PORT lisa-content-app-plugin/includes/class-api-handler.php \\"
echo "       $USER@$HOST:~/public_html/wp-content/plugins/article-writer-publisher/includes/"
echo ""
echo "2️⃣  Upload Backend:"
echo "   scp -P $PORT -r dist/server/* \\"
echo "       $USER@$HOST:~/api.volxai.com/dist/server/"
echo ""
echo "3️⃣  Upload Frontend:"
echo "   scp -P $PORT -r dist/spa/* \\"
echo "       $USER@$HOST:~/volxai.com/"
echo ""
echo "4️⃣  Restart Backend (via SSH):"
echo "   ssh -p $PORT $USER@$HOST"
echo "   cd ~/api.volxai.com"
echo "   pm2 restart volxai-backend"
echo "   pm2 logs volxai-backend --lines 50"
echo ""
echo "Press Enter to start deployment..."
read

# Step 1: WordPress Plugin
echo ""
echo "📤 Step 1: Uploading WordPress Plugin..."
scp -P $PORT lisa-content-app-plugin/includes/class-api-handler.php \
    $USER@$HOST:~/public_html/wp-content/plugins/article-writer-publisher/includes/

if [ $? -eq 0 ]; then
    echo "✅ Plugin uploaded successfully"
else
    echo "❌ Plugin upload failed - but continuing..."
fi

# Step 2: Backend
echo ""
echo "📤 Step 2: Uploading Backend..."
scp -P $PORT -r dist/server/* \
    $USER@$HOST:~/api.volxai.com/dist/server/

if [ $? -eq 0 ]; then
    echo "✅ Backend uploaded successfully"
else
    echo "❌ Backend upload failed!"
    exit 1
fi

# Step 3: Frontend
echo ""
echo "📤 Step 3: Uploading Frontend..."
scp -P $PORT -r dist/spa/* \
    $USER@$HOST:~/volxai.com/

if [ $? -eq 0 ]; then
    echo "✅ Frontend uploaded successfully"
else
    echo "❌ Frontend upload failed!"
    exit 1
fi

# Step 4: Restart instructions
echo ""
echo "✅ Files uploaded successfully!"
echo ""
echo "🔄 Now restart the backend manually:"
echo "   ssh -p $PORT $USER@$HOST"
echo "   cd ~/api.volxai.com"
echo "   pm2 restart volxai-backend"
echo ""
echo "Or run this command:"
echo "   ssh -p $PORT $USER@$HOST 'cd ~/api.volxai.com && pm2 restart volxai-backend && pm2 logs volxai-backend --lines 20'"
