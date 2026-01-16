#!/bin/bash

echo "🔍 Monitoring Batch Job Logs (Press Ctrl+C to stop)"
echo "Looking for: getApiKeyForModel, callAI, provider info..."
echo ""

sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com 'tail -f ~/api.volxai.com/stderr.log' | grep --line-buffered -E "getApiKeyForModel|callAI|provider=|BatchWorker.*Creating|Google AI|OpenAI API error" | while read line; do
  if [[ $line == *"OpenAI API error"* ]] && [[ $line == *"AIzaSy"* ]]; then
    echo "❌ STILL WRONG! Google key sent to OpenAI:"
    echo "   $line"
  elif [[ $line == *"Google AI"* ]]; then
    echo "✅ $line"
  elif [[ $line == *"getApiKeyForModel"* ]]; then
    echo "🔍 $line"
  elif [[ $line == *"provider="* ]]; then
    echo "📌 $line"
  elif [[ $line == *"BatchWorker"* ]]; then
    echo "📝 $line"
  else
    echo "   $line"
  fi
done
