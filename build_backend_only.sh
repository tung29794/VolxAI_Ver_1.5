#!/bin/bash
# Build script for hosting - sử dụng NVM để load Node 20

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Use Node 20
nvm use 20 || { echo "❌ Failed to switch to Node 20"; exit 1; }

echo "✅ Node version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Build backend server only
echo ""
echo "🔨 Building backend server..."
cd /home/jybcaorr/api.volxai.com
npm run build:server 2>&1

BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    echo "✅ Backend build SUCCESS!"
else
    echo "❌ Backend build FAILED!"
fi

exit $BUILD_STATUS
