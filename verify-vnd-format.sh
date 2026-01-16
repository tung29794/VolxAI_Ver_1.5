#!/bin/bash

echo "🔍 Verifying VND Format Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Local source code
echo "📝 Check 1: Source Code"
if grep -q 'const formatVND' client/components/admin/AdminOverview.tsx; then
    echo -e "${GREEN}✅ formatVND function exists in source${NC}"
else
    echo -e "${RED}❌ formatVND function NOT found in source${NC}"
fi

if grep -q 'formatVND(stats.totalRevenue)' client/components/admin/AdminOverview.tsx; then
    echo -e "${GREEN}✅ formatVND applied to totalRevenue${NC}"
else
    echo -e "${RED}❌ formatVND NOT applied to totalRevenue${NC}"
fi

if grep -q 'formatVND(item.amount)' client/components/admin/AdminOverview.tsx; then
    echo -e "${GREEN}✅ formatVND applied to chart tooltips${NC}"
else
    echo -e "${RED}❌ formatVND NOT applied to tooltips${NC}"
fi

echo ""

# Check 2: Local build
echo "📦 Check 2: Local Build"
if [ -f "dist/spa/assets/index-iocziqM1.js" ]; then
    echo -e "${GREEN}✅ Build file exists: index-iocziqM1.js${NC}"
    
    count=$(grep -o 'toLocaleString("vi-VN")' dist/spa/assets/index-iocziqM1.js | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $count occurrences of toLocaleString(\"vi-VN\")${NC}"
    else
        echo -e "${RED}❌ toLocaleString(\"vi-VN\") NOT found in build${NC}"
    fi
else
    echo -e "${RED}❌ Build file NOT found${NC}"
fi

if grep -q 'index-iocziqM1.js' dist/spa/index.html; then
    echo -e "${GREEN}✅ index.html references correct file${NC}"
else
    echo -e "${YELLOW}⚠️  index.html might reference old file${NC}"
fi

echo ""

# Check 3: Production server
echo "🌐 Check 3: Production Server"
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "cd public_html && \
    if [ -f assets/index-iocziqM1.js ]; then \
        echo '✅ Production file exists'; \
    else \
        echo '❌ Production file NOT found'; \
    fi"

ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "cd public_html && \
    if grep -q 'index-iocziqM1.js' index.html; then \
        echo '✅ Production index.html references correct file'; \
    else \
        echo '⚠️  Production index.html might reference old file'; \
    fi"

prod_count=$(ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
    "cd public_html/assets && grep -o 'toLocaleString(\"vi-VN\")' index-iocziqM1.js | wc -l" | tr -d ' ')
if [ "$prod_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $prod_count occurrences in production${NC}"
else
    echo -e "${RED}❌ toLocaleString(\"vi-VN\") NOT found in production${NC}"
fi

echo ""

# Check 4: Test format function
echo "🧪 Check 4: Test Format Function"
node -e "
const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';
console.log('Test 18350000:', formatVND(18350000));
console.log('Test 1000000:', formatVND(1000000));
console.log('Test 500000:', formatVND(500000));
"

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open: https://volxai.com/admin"
echo "2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "3. Check 'Tổng doanh thu' card"
echo "4. Expected: 18.350.000đ (with dots)"
echo ""
echo -e "${YELLOW}If still not working:${NC}"
echo "- Open DevTools Console (F12)"
echo "- Run: document.querySelector('script[src*=\"index\"]').src"
echo "- Should show: index-iocziqM1.js"
echo "- If shows old file, clear browser cache completely"
echo ""
