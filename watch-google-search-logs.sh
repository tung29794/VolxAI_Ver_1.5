#!/bin/bash

echo "📋 Watching production server logs for Google Search activity..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Looking for these indicators:"
echo "  ✅ 🌐 Starting Google Web Search"
echo "  ✅ Successfully fetched X web results"
echo "  ✅ Search context length"
echo "  ✅ Injecting Google search context"
echo ""
echo "Press Ctrl+C to stop..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -f /home/jybcaorr/logs/api.volxai.com.access_log" | grep --line-buffered -E "Google Web Search|web results|Search context|Injecting.*search|searchGoogleWeb|🌐|🔍.*Starting Google"
