#!/bin/bash

# Script để xem logs real-time từ production server
# Usage: ./watch-logs.sh

echo "🔍 Connecting to production server to watch logs..."
echo "Press Ctrl+C to stop"
echo ""

ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "
  echo '📋 Watching Node.js application logs...'
  echo '=================================='
  
  # Try different possible log locations
  if [ -f /home/jybcaorr/api.volxai.com/logs/app.log ]; then
    tail -f /home/jybcaorr/api.volxai.com/logs/app.log
  elif [ -f /home/jybcaorr/api.volxai.com/logs/error.log ]; then
    tail -f /home/jybcaorr/api.volxai.com/logs/error.log  
  elif [ -f /home/jybcaorr/api.volxai.com/passenger.log ]; then
    tail -f /home/jybcaorr/api.volxai.com/passenger.log
  else
    echo '❌ No log files found. Trying to read from stderr/stdout...'
    echo 'Possible log locations:'
    echo '  - /home/jybcaorr/api.volxai.com/logs/'
    echo '  - /home/jybcaorr/api.volxai.com/'
    echo ''
    echo 'Listing files in app directory:'
    ls -la /home/jybcaorr/api.volxai.com/
  fi
"
