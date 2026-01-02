#!/bin/bash

#############################################
# VolxAI Production Deployment
# Target: Azdigi Host (cPanel)
# Usage: bash DEPLOY_PRODUCTION.sh
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_PATH="/home/jybcaorr/api.volxai.com"
FRONTEND_PATH="/home/jybcaorr/public_html"
DIST_FRONTEND="$PWD/dist/spa"
DIST_BACKEND="$PWD/dist/server"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 VolxAI Production Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Step 1: Verify build files exist
echo -e "${YELLOW}[1/6] Kiểm tra file build...${NC}"
if [ ! -d "$DIST_FRONTEND" ]; then
  echo -e "${RED}✗ Frontend build không tìm thấy: $DIST_FRONTEND${NC}"
  echo -e "${YELLOW}   Vui lòng chạy: npm run build${NC}"
  exit 1
fi

if [ ! -d "$DIST_BACKEND" ]; then
  echo -e "${RED}✗ Backend build không tìm thấy: $DIST_BACKEND${NC}"
  echo -e "${YELLOW}   Vui lòng chạy: npm run build${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Tất cả file build tìm thấy${NC}\n"

# Step 2: Create directories if not exist
echo -e "${YELLOW}[2/6] Tạo thư mục deployment...${NC}"
mkdir -p "$BACKEND_PATH"
mkdir -p "$FRONTEND_PATH"
echo -e "${GREEN}✓ Thư mục đã tạo${NC}\n"

# Step 3: Deploy backend
echo -e "${YELLOW}[3/6] Triển khai backend...${NC}"
echo -e "   Xóa files cũ..."
find "$BACKEND_PATH" -mindepth 1 -maxdepth 1 -not -name ".env" -exec rm -rf {} + 2>/dev/null || true

echo -e "   Copy files mới..."
cp -r "$DIST_BACKEND"/* "$BACKEND_PATH/"

# Copy package.json
if [ -f "package.json" ]; then
  cp package.json "$BACKEND_PATH/package.json"
  echo -e "${GREEN}✓ Backend deployed${NC}\n"
else
  echo -e "${YELLOW}⚠ Cảnh báo: package.json không tìm thấy${NC}\n"
fi

# Step 4: Deploy frontend
echo -e "${YELLOW}[4/6] Triển khai frontend...${NC}"
echo -e "   Xóa files cũ..."
find "$FRONTEND_PATH" -mindepth 1 -maxdepth 1 -type f -name "*.html" -o -name "*.js" -o -name "*.css" | xargs rm -f 2>/dev/null || true
rm -rf "$FRONTEND_PATH/assets" 2>/dev/null || true

echo -e "   Copy files mới..."
cp -r "$DIST_FRONTEND"/* "$FRONTEND_PATH/"
echo -e "${GREEN}✓ Frontend deployed${NC}\n"

# Step 5: Create .env file for backend
echo -e "${YELLOW}[5/6] Tạo .env configuration...${NC}"
cat > "$BACKEND_PATH/.env" << 'EOF'
# VolxAI Production Environment
DB_HOST=localhost
DB_PORT=3306
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=ISlc)_+hKk+g2.m^
DB_NAME=jybcaorr_lisacontentdbapi
PORT=3000
NODE_ENV=production
JWT_SECRET=964dWJijnTQc0BencpGcDADL+7GIGP3av7SaeVZtzbY=
VITE_API_URL=https://api.volxai.com
VITE_APP_NAME=VolxAI
VITE_APP_VERSION=1.0.0
PING_MESSAGE=ping pong
EOF
echo -e "${GREEN}✓ .env file created${NC}\n"

# Step 6: Verification
echo -e "${YELLOW}[6/6] Xác minh deployment...${NC}"

echo -e "\n${BLUE}📂 File Structure Check:${NC}"

if [ -f "$BACKEND_PATH/node-build.mjs" ]; then
  echo -e "${GREEN}✓${NC} Backend entry point: $BACKEND_PATH/node-build.mjs"
else
  echo -e "${RED}✗${NC} Backend entry point MISSING"
fi

if [ -f "$FRONTEND_PATH/index.html" ]; then
  echo -e "${GREEN}✓${NC} Frontend entry point: $FRONTEND_PATH/index.html"
else
  echo -e "${RED}✗${NC} Frontend entry point MISSING"
fi

if [ -f "$BACKEND_PATH/.env" ]; then
  echo -e "${GREEN}✓${NC} Backend .env configured"
else
  echo -e "${RED}✗${NC} Backend .env MISSING"
fi

echo -e "\n${BLUE}📋 Deployment Summary:${NC}"
echo -e "  Frontend Path: ${GREEN}$FRONTEND_PATH${NC}"
echo -e "  Backend Path: ${GREEN}$BACKEND_PATH${NC}"
echo -e "  Frontend URL: ${GREEN}https://volxai.com${NC}"
echo -e "  Backend URL: ${GREEN}https://api.volxai.com${NC}"

echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Log in to cPanel: https://ghf57-22175.azdigihost.com:2083"
echo -e "  2. Go to: Setup Node.js App"
echo -e "  3. Create/Update Application:"
echo -e "     ${YELLOW}Application Name:${NC} volxai-api"
echo -e "     ${YELLOW}Application Root:${NC} $BACKEND_PATH"
echo -e "     ${YELLOW}Startup File:${NC} node-build.mjs"
echo -e "     ${YELLOW}Port:${NC} 3000"
echo -e "  4. Click: ${GREEN}Create${NC} (hoặc Restart nếu đã tạo)"
echo -e "  5. Wait 30 seconds for server to start"
echo -e "  6. Test: ${GREEN}curl https://api.volxai.com/api/ping${NC}"

echo -e "\n${GREEN}✅ Deployment Complete!${NC}\n"
