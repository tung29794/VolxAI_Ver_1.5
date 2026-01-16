#!/bin/bash

# ================================================================
# Test AI Functions với Database Prompts
# ================================================================
# Script này test tất cả 5 AI functions để verify integration
# ================================================================

# ANSI colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="https://api.volxai.com"

echo -e "${BLUE}🧪 Testing AI Functions with Database Prompts${NC}"
echo ""

# Get token from user
echo -e "${YELLOW}🔐 Please enter your authentication token:${NC}"
read -s AUTH_TOKEN
echo ""

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}❌ ERROR: Token is required${NC}"
    exit 1
fi

# Test counter
PASSED=0
FAILED=0

# ================================================================
# Test 1: Rewrite Content
# ================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: Rewrite Content${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/ai/rewrite" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trí tuệ nhân tạo đang thay đổi thế giới.",
    "style": "professional",
    "language": "vi"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - HTTP $HTTP_CODE"
    echo "Response: $(echo $BODY | jq -r '.rewrittenText' | head -c 100)..."
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "Response: $BODY"
    ((FAILED++))
fi
echo ""

# ================================================================
# Test 2: Generate SEO Title
# ================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: Generate SEO Title${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/ai/generate-seo-title" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Trí tuệ nhân tạo",
    "language": "vi"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - HTTP $HTTP_CODE"
    echo "Title: $(echo $BODY | jq -r '.title')"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "Response: $BODY"
    ((FAILED++))
fi
echo ""

# ================================================================
# Test 3: Generate Meta Description
# ================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 3: Generate Meta Description${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/ai/generate-meta-description" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Trí tuệ nhân tạo",
    "language": "vi",
    "content": "AI đang thay đổi cách chúng ta làm việc và sống."
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - HTTP $HTTP_CODE"
    echo "Description: $(echo $BODY | jq -r '.description')"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "Response: $BODY"
    ((FAILED++))
fi
echo ""

# ================================================================
# Test 4: Write More (Expand Content)
# ================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 4: Write More (Expand Content)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/ai/write-more" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trí tuệ nhân tạo là công nghệ tương lai.",
    "language": "vi"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - HTTP $HTTP_CODE"
    echo "Content: $(echo $BODY | jq -r '.writtenContent' | head -c 100)..."
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "Response: $BODY"
    ((FAILED++))
fi
echo ""

# ================================================================
# Test 5: Generate Article
# ================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 5: Generate Article${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/ai/generate-article" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Trí tuệ nhân tạo trong y tế",
    "language": "vi",
    "outlineType": "ai-outline",
    "tone": "professional",
    "model": "GPT 3.5"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - HTTP $HTTP_CODE"
    echo "Article ID: $(echo $BODY | jq -r '.articleId')"
    echo "Title: $(echo $BODY | jq -r '.title')"
    echo "Content: $(echo $BODY | jq -r '.content' | head -c 100)..."
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "Response: $BODY"
    ((FAILED++))
fi
echo ""

# ================================================================
# Summary
# ================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Database prompts integration is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the errors above.${NC}"
    exit 1
fi
