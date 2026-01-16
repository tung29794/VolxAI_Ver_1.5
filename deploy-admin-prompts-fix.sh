#!/bin/bash

# Deploy Admin Prompts Fix to Production
# This script builds and deploys the AI Prompts feature fix

set -e

echo "🚀 Deploying Admin Prompts Fix..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build server
echo -e "${BLUE}📦 Building server...${NC}"
npm run build:server

# Deploy server
echo -e "${BLUE}🚀 Deploying server to api.volxai.com...${NC}"
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

# Restart server
echo -e "${BLUE}🔄 Restarting server...${NC}"
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"

# Build client
echo -e "${BLUE}📦 Building client...${NC}"
npm run build:client

# Deploy client
echo -e "${BLUE}🚀 Deploying client to volxai.com...${NC}"
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess'

echo -e "${GREEN}✅ Deploy completed successfully!${NC}"
echo ""
echo "🔗 Test the fix at: https://volxai.com/admin"
echo "📝 Check AI Prompts page in the admin panel"
