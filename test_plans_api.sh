#!/bin/bash

# Test /api/admin/plans endpoint
echo "Testing /api/admin/plans endpoint..."
echo "========================================"

# Get auth token from localStorage (you need to provide this manually)
# For now, let's just test the endpoint structure

curl -s -X GET "https://api.volxai.com/admin/plans" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  2>&1 | jq . || echo "Failed to fetch plans"

echo ""
echo "Testing /api/models endpoint..."
echo "========================================"

curl -s -X GET "https://api.volxai.com/models" \
  -H "Content-Type: application/json" \
  2>&1 | jq . || echo "Failed to fetch models"
