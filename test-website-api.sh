#!/bin/bash

# Get your JWT token from localStorage and paste it here
TOKEN="YOUR_JWT_TOKEN_HERE"

echo "Testing /api/websites/test endpoint..."
echo ""

curl -X POST https://api.volxai.com/api/websites/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "url": "https://danangchillride.com",
    "apiToken": "aw-211d4be5cc32fce5932cda0b396c4ce4970cf9d1780937079f191ddab4418a35"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Done!"
