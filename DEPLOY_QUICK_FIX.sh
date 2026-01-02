#!/bin/bash

#############################################
# VolxAI Quick Fix - Copy Missing Files
# Run this on your server to fix missing files
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKEND_PATH="/home/jybcaorr/api.volxai.com"

echo -e "${YELLOW}🔧 VolxAI Quick Fix - Copying Missing Files${NC}\n"

# Step 1: Copy package.json
echo -e "${YELLOW}[1/2] Copying package.json...${NC}"
if [ -f "/home/jybcaorr/package.json" ]; then
  cp /home/jybcaorr/package.json "$BACKEND_PATH/package.json"
  echo -e "${GREEN}✓ package.json copied${NC}\n"
else
  echo -e "${RED}✗ package.json not found${NC}\n"
fi

# Step 2: Create/Update .env file
echo -e "${YELLOW}[2/2] Creating .env file...${NC}"
cat > "$BACKEND_PATH/.env" << 'EOF'
# VolxAI Production Environment Variables
DB_HOST=localhost
DB_PORT=3306
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=ISlc)_+hKk+g2.m^
DB_NAME=jybcaorr_lisacontentdbapi
PORT=3000
NODE_ENV=production
JWT_SECRET=volxai-secret-jwt-key-2024-production-v1
PING_MESSAGE=ping pong
VITE_API_URL=https://api.volxai.com
VITE_APP_NAME=VolxAI
VITE_APP_VERSION=1.0.0
EOF
echo -e "${GREEN}✓ .env file created${NC}\n"

# Verification
echo -e "${YELLOW}📋 Verification:${NC}"
if [ -f "$BACKEND_PATH/package.json" ]; then
  echo -e "${GREEN}✓ package.json exists${NC}"
else
  echo -e "${RED}✗ package.json missing${NC}"
fi

if [ -f "$BACKEND_PATH/.env" ]; then
  echo -e "${GREEN}✓ .env file exists${NC}"
else
  echo -e "${RED}✗ .env file missing${NC}"
fi

if [ -f "$BACKEND_PATH/node-build.mjs" ]; then
  echo -e "${GREEN}✓ node-build.mjs exists${NC}"
else
  echo -e "${RED}✗ node-build.mjs missing${NC}"
fi

echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "1. In cPanel → Setup Node.js App → Restart volxai-api"
echo "2. Wait 30 seconds"
echo "3. Test: curl https://api.volxai.com/api/ping"
echo ""
echo -e "${GREEN}✅ Done!${NC}\n"
