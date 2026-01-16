#!/bin/bash

echo "🔍 Checking Batch Job #24 Configuration..."
echo ""

sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com << 'ENDSSH'

mysql -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' jybcaorr_lisacontentdbapi << 'ENDSQL'

-- Check batch job #24
SELECT 
  id,
  status,
  failed_items,
  JSON_EXTRACT(job_data, '$.settings.model') as model,
  JSON_EXTRACT(job_data, '$.settings.useGoogleSearch') as useGoogleSearch,
  error_message
FROM batch_jobs 
WHERE id = 24;

-- Check if model exists in ai_models
SELECT 
  'Model exists?' as check_type,
  model_id, 
  display_name, 
  provider 
FROM ai_models 
WHERE model_id = 'gemini-2.5-flash' OR display_name = 'Gemini 2.5 Flash';

-- Check API key
SELECT 
  'API Key exists?' as check_type,
  provider,
  category,
  is_active,
  SUBSTRING(api_key, 1, 20) as key_preview
FROM api_keys
WHERE provider = 'google-ai' AND category = 'content';

ENDSQL

echo ""
echo "📋 Checking server logs..."
tail -50 ~/api.volxai.com/stderr.log | grep -i "batch\|gemini\|google" | tail -20

ENDSSH
