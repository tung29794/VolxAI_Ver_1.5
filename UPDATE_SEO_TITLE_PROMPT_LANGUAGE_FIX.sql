-- ============================================
-- UPDATE SEO Title Generation Prompt
-- Fix: Ensure AI generates title in correct language (Vietnamese)
-- Date: 2026-01-06
-- ============================================

UPDATE ai_prompts 
SET 
  prompt_template = 'Create an SEO-optimized title for the keyword: "{keyword}".

CRITICAL REQUIREMENT - Language:
- You MUST write the ENTIRE title in the language specified: {language_instruction}
- Do NOT mix languages or use English unless explicitly instructed
- The title must be COMPLETELY in the target language from start to finish
- All words in the title MUST be in the target language

The title should be:
- Between 50-60 characters
- Include the keyword naturally
- Be compelling and click-worthy
- Match search intent
- Use power words when appropriate

Return ONLY the title in the target language, without quotes or extra text.',
  
  system_prompt = 'You are an SEO expert specializing in creating compelling, click-worthy titles. {language_instruction}. You MUST write ONLY in the specified language. Create titles that rank well and attract clicks.',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_seo_title';

-- Verify the update
SELECT 
  feature_name, 
  display_name,
  LEFT(prompt_template, 100) as prompt_preview,
  LEFT(system_prompt, 100) as system_preview,
  updated_at
FROM ai_prompts 
WHERE feature_name = 'generate_seo_title';
