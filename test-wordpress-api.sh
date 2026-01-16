#!/bin/bash

# Test WordPress API directly
# This helps debug if post_type is being sent correctly

echo "🧪 Testing WordPress API for Custom Post Type"
echo "=============================================="
echo ""

# Configuration - UPDATE THESE
WP_URL="https://danangchillride.com"
API_TOKEN="YOUR_API_TOKEN_HERE"  # Get from WordPress admin

echo "📝 Test 1: Publish with default post type (post)"
echo "================================================"
curl -X POST "${WP_URL}/wp-json/article-writer/v1/publish" \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: ${API_TOKEN}" \
  -d '{
    "title": "Test Post - Default Type",
    "content": "This should be a regular post",
    "status": "draft",
    "post_type": "post"
  }' | jq .

echo ""
echo ""
echo "📝 Test 2: Publish with custom post type (tour)"
echo "================================================"
curl -X POST "${WP_URL}/wp-json/article-writer/v1/publish" \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: ${API_TOKEN}" \
  -d '{
    "title": "Test Post - Custom Tour Type",
    "content": "This should be a tour post type",
    "status": "draft",
    "post_type": "tour"
  }' | jq .

echo ""
echo ""
echo "📝 Test 3: Get taxonomies for post type"
echo "========================================"
curl -X GET "${WP_URL}/wp-json/article-writer/v1/taxonomies?post_type=post" \
  -H "X-Article-Writer-Token: ${API_TOKEN}" | jq .

echo ""
echo ""
echo "✅ Tests complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check WordPress admin for the test posts"
echo "2. Verify they are in correct post types"
echo "3. Check WordPress debug.log or error_log for detailed logs"
