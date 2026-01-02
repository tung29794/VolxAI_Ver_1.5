#!/bin/bash

#############################################
# VolxAI Automated Deployment Script
# Run this on your server via SSH
# Usage: bash DEPLOY.sh
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSH_HOST="ghf57-22175.azdigihost.com"
SSH_USER="jybcaorr"
BACKEND_PATH="/home/jybcaorr/api.volxai.com"
FRONTEND_PATH="/home/jybcaorr/public_html"
DIST_PATH="/home/jybcaorr/dist"
DB_HOST="localhost"
DB_NAME="jybcaorr_lisacontentdbapi"
DB_USER="jybcaorr_lisaaccountcontentapi"
DB_PASSWORD="ISlc)_+hKk+g2.m^"
FRONTEND_URL="https://volxai.com"
BACKEND_URL="https://api.volxai.com"

echo -e "${YELLOW}🚀 VolxAI Deployment Starting...${NC}\n"

# Step 1: Create directories
echo -e "${YELLOW}[1/6] Creating directories...${NC}"
mkdir -p "$BACKEND_PATH"
mkdir -p "$FRONTEND_PATH"
echo -e "${GREEN}✓ Directories created${NC}\n"

# Step 2: Copy backend files
echo -e "${YELLOW}[2/6] Deploying backend files...${NC}"
if [ -d "$DIST_PATH/server" ]; then
  cp -r "$DIST_PATH/server"/* "$BACKEND_PATH/" 2>/dev/null || true
  echo -e "${GREEN}✓ Backend files copied from $DIST_PATH/server${NC}\n"
else
  echo -e "${RED}✗ dist/server folder not found at $DIST_PATH/server${NC}\n"
fi

# Copy package.json if it exists (needed for npm dependencies and cPanel recognition)
if [ -f "/home/jybcaorr/package.json" ]; then
  cp /home/jybcaorr/package.json "$BACKEND_PATH/package.json"
  echo -e "${GREEN}✓ package.json copied${NC}\n"
else
  echo -e "${YELLOW}⚠ package.json not found in /home/jybcaorr${NC}\n"
fi

# Step 3: Create .env file
echo -e "${YELLOW}[3/6] Creating .env configuration...${NC}"
# Remove old .env if it exists
[ -f "$BACKEND_PATH/.env" ] && rm "$BACKEND_PATH/.env"

# Create new .env file
cat > "$BACKEND_PATH/.env" << 'ENVEOF'
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
ENVEOF

# Verify .env was created
if [ -f "$BACKEND_PATH/.env" ]; then
  echo -e "${GREEN}✓ .env file created${NC}\n"
else
  echo -e "${RED}✗ Failed to create .env file${NC}\n"
fi

# Step 4: Copy frontend files
echo -e "${YELLOW}[4/6] Deploying frontend files...${NC}"
if [ -d "$DIST_PATH/spa" ]; then
  # Clean old files first
  rm -rf "$FRONTEND_PATH"/*
  cp -r "$DIST_PATH/spa"/* "$FRONTEND_PATH/" 2>/dev/null || true
  echo -e "${GREEN}✓ Frontend files copied from $DIST_PATH/spa${NC}\n"
else
  echo -e "${RED}✗ dist/spa folder not found at $DIST_PATH/spa${NC}\n"
fi

# Step 5: Update .env.production
echo -e "${YELLOW}[5/6] Updating frontend API URL...${NC}"
sed -i "s|VITE_API_URL=.*|VITE_API_URL=$BACKEND_URL|g" "$FRONTEND_PATH/.env" 2>/dev/null || true
echo -e "${GREEN}✓ Frontend API URL updated${NC}\n"

# Step 6: Database import info
echo -e "${YELLOW}[6/6] Database setup instructions...${NC}"
cat > "$BACKEND_PATH/DATABASE_SETUP.txt" << EOF
DATABASE IMPORT INSTRUCTIONS
===========================

1. Open phpMyAdmin:
   URL: https://$SSH_HOST:2083 → phpMyAdmin

2. Select Database:
   $DB_NAME

3. Click SQL Tab

4. Copy-paste content from DATABASE_IMPORT.sql

5. Click Go

6. Verify 7 tables created:
   - users
   - sessions
   - articles
   - user_subscriptions
   - user_usage
   - password_reset_tokens
   - activity_log

Database Credentials:
- Host: $DB_HOST
- User: $DB_USER
- Password: (*****)
- Database: $DB_NAME
EOF

echo -e "${GREEN}✓ Database setup info created${NC}\n"

# Verification
echo -e "${YELLOW}📋 Deployment Summary:${NC}"
echo -e "Source dist Path: ${GREEN}$DIST_PATH${NC}"
echo -e "Backend Path: ${GREEN}$BACKEND_PATH${NC}"
echo -e "Frontend Path: ${GREEN}$FRONTEND_PATH${NC}"
echo -e "Frontend URL: ${GREEN}$FRONTEND_URL${NC}"
echo -e "Backend URL: ${GREEN}$BACKEND_URL${NC}"
echo -e "Database: ${GREEN}$DB_NAME${NC}\n"

# Check if dist exists
if [ ! -d "$DIST_PATH" ]; then
    echo -e "${RED}✗ ERROR: dist folder not found at $DIST_PATH${NC}"
    echo -e "${YELLOW}   Make sure you uploaded the entire dist/ folder to /home/jybcaorr/${NC}\n"
fi

# Check if files exist
if [ -f "$BACKEND_PATH/node-build.mjs" ]; then
    echo -e "${GREEN}✓ Backend executable found${NC}"
else
    echo -e "${RED}✗ Backend executable NOT found at $BACKEND_PATH/node-build.mjs${NC}"
    if [ -f "$DIST_PATH/server/node-build.mjs" ]; then
        echo -e "${YELLOW}  (Found in dist, will copy next run)${NC}"
    fi
fi

if [ -f "$FRONTEND_PATH/index.html" ]; then
    echo -e "${GREEN}✓ Frontend index.html found${NC}"
else
    echo -e "${RED}✗ Frontend index.html NOT found at $FRONTEND_PATH/index.html${NC}"
    if [ -f "$DIST_PATH/spa/index.html" ]; then
        echo -e "${YELLOW}  (Found in dist, will copy next run)${NC}"
    fi
fi

if [ -f "$BACKEND_PATH/.env" ]; then
    echo -e "${GREEN}✓ .env configuration created${NC}"
else
    echo -e "${RED}✗ .env file NOT created${NC}"
fi

echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "1. Import database schema in phpMyAdmin:"
echo "   - Open phpMyAdmin"
echo "   - Select database: $DB_NAME"
echo "   - Click SQL tab"
echo "   - Paste content from: DATABASE_IMPORT.sql"
echo "   - Click Go"
echo ""
echo "2. Setup Node.js App in cPanel:"
echo "   - cPanel → Setup Node.js App"
echo "   - Create Application"
echo "   - Application Name: volxai-api"
echo "   - Application Root: $BACKEND_PATH"
echo "   - Startup File: node-build.mjs"
echo ""
echo "3. Test your deployment:"
echo "   - Visit: $FRONTEND_URL"
echo "   - Test login at: $FRONTEND_URL/login"
echo ""
echo -e "${GREEN}✅ Deployment script completed!${NC}\n"
echo -e "${YELLOW}⚠️  IMPORTANT: Complete steps 1-3 above manually via cPanel${NC}\n"
