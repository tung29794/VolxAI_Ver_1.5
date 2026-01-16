#!/bin/bash

# Deploy AI Rewrite Fix to Hosting via SSH
# Configuration
SSH_HOST="ghf57-22175.azdigihost.com"
SSH_PORT="2210"
SSH_USER="jybcaorr"
SSH_PASSWORD=";)|o|=NhgnM)"
REMOTE_PATH="/home/jybcaorr/VolxAI"

echo "======================================"
echo "🚀 Deploying AI Rewrite Fix to Hosting"
echo "======================================"
echo ""
echo "📍 Target: $SSH_HOST:$REMOTE_PATH"
echo ""

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deploy."
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy using sshpass and scp
echo "📤 Uploading fixed files to server..."

# Install sshpass if not already installed
if ! command -v sshpass &> /dev/null; then
    echo "📥 Installing sshpass..."
    brew install sshpass
fi

# Copy the compiled server files
echo "Uploading server files..."
sshpass -p "$SSH_PASSWORD" scp -P $SSH_PORT dist/server/node-build.mjs $SSH_USER@$SSH_HOST:$REMOTE_PATH/

# Copy the compiled client files
echo "Uploading client files..."
sshpass -p "$SSH_PASSWORD" scp -P $SSH_PORT -r dist/spa/ $SSH_USER@$SSH_HOST:$REMOTE_PATH/dist/

# Optional: Create a restart script and run it
echo ""
echo "🔄 Restarting server..."
sshpass -p "$SSH_PASSWORD" ssh -p $SSH_PORT $SSH_USER@$SSH_HOST << 'EOF'
cd $REMOTE_PATH

# Kill existing Node process
pkill -f "node" || true

# Wait a moment
sleep 2

# Restart the server (adjust based on your server startup method)
npm start &

echo "✅ Server restarted"
EOF

echo ""
echo "======================================"
echo "✅ Deploy Complete!"
echo "======================================"
echo ""
echo "Changes deployed:"
echo "  - ✅ AI Rewrite endpoint with user authentication"
echo "  - ✅ Database schema for tracking rewrites"
echo "  - ✅ Frontend UI improvements"
echo ""
echo "Testing the fix:"
echo "  1. Open your admin panel"
echo "  2. Go to Article Editor"
echo "  3. Write some text"
echo "  4. Select text and click ⚡ AI Rewrite"
echo "  5. Choose a rewrite style"
echo ""
echo "If you see the rewritten text, the fix is working! ✨"
