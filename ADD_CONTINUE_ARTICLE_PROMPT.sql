-- =====================================================
-- ADD CONTINUE ARTICLE PROMPT TO DATABASE
-- Purpose: Add prompt template for article continuation
-- =====================================================

INSERT INTO ai_prompts (
  feature_name,
  display_name,
  description,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'continue_article',
  'Continue Article Generation',
  'Prompt template for continuing article generation when outline is incomplete or article was cut off',
  '{continuation_instruction}

⚠️ IMPORTANT RULES (MUST FOLLOW):
{continuation_rules}

{outline_reference}

Continue writing with multiple paragraphs per heading:',
  'You are a professional SEO content writer continuing an article. Follow the writing style and format of the previous content.',
  '["continuation_instruction", "continuation_rules", "outline_reference", "writing_style", "min_words", "max_words", "h2_paragraphs", "h3_paragraphs", "paragraph_words"]',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  prompt_template = VALUES(prompt_template),
  system_prompt = VALUES(system_prompt),
  available_variables = VALUES(available_variables),
  updated_at = NOW();
