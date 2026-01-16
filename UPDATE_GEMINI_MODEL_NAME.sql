-- Update Gemini model display name to include "Sử dụng dữ liệu mới nhất"
UPDATE ai_models 
SET display_name = 'Gemini - Sử dụng dữ liệu mới nhất'
WHERE provider = 'google-ai' 
  AND model_name = 'gemini-2.0-flash-exp';

-- Verify the update
SELECT id, display_name, model_name, provider, is_active 
FROM ai_models 
WHERE provider = 'google-ai';
