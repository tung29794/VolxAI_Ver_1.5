-- ============================================
-- AI Prompts for SEO Title, Meta Description, Article Title
-- ============================================

-- Insert prompt for generating SEO titles
INSERT INTO ai_prompts (
  feature_name, 
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_seo_title',
  'Create an SEO-optimized title for:

Article Title: {title}
Target Keyword: {keyword}
Language: {language}

Requirements:
- Include the target keyword naturally
- Keep it under 60 characters
- Make it search engine friendly
- MUST be in {language} language ONLY (not English or other languages)
- Use numbers or power words if possible
- Make it click-worthy

Output ONLY the SEO title in {language}, nothing else.',
  'You are an expert SEO specialist. Your task is to create compelling, SEO-optimized titles that:
1. Include the target keyword naturally
2. Are under 60 characters
3. Appeal to search engine algorithms
4. Encourage clicks from search results
5. Follow the specified language requirement strictly
6. Never use English if another language is specified

CRITICAL: Output MUST be in the specified language ONLY. Do NOT use English or mix languages.',
  '["title", "keyword", "language"]',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  prompt_template = VALUES(prompt_template),
  system_prompt = VALUES(system_prompt),
  is_active = 1,
  updated_at = NOW();

-- Insert prompt for generating meta descriptions
INSERT INTO ai_prompts (
  feature_name,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_meta_description',
  'Create an SEO-optimized meta description for:

Article Title: {title}
Target Keyword: {keyword}
Language: {language}

Requirements:
- Include the target keyword naturally (at least once)
- Keep it between 150-160 characters (important for search results)
- Make it compelling and informative
- Encourage clicks from search engine results
- Summarize the main benefit or content
- MUST be in {language} language ONLY (not English or other languages)
- Avoid special characters and HTML
- End with a call-to-action if possible

Output ONLY the meta description in {language}, nothing else.',
  'You are an expert SEO copywriter. Your task is to create compelling meta descriptions that:
1. Include the target keyword naturally
2. Are 150-160 characters (critical for Google search results)
3. Encourage clicks from search listings
4. Accurately summarize the article content
5. Follow the specified language requirement strictly
6. Never use English if another language is specified

CRITICAL: Output MUST be in the specified language ONLY. Do NOT use English or mix languages. Character count MUST be 150-160.',
  '["title", "keyword", "language"]',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  prompt_template = VALUES(prompt_template),
  system_prompt = VALUES(system_prompt),
  is_active = 1,
  updated_at = NOW();

-- Insert prompt for generating article titles
INSERT INTO ai_prompts (
  feature_name,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_article_title',
  'Generate an engaging and compelling article title for the keyword: {keyword}

Requirements:
- Language: {language}
- Tone: {tone}
- Make it compelling and click-worthy
- Keep it concise (under 60 characters recommended)
- Include the keyword naturally if possible
- Use power words, numbers, or emotional triggers
- Avoid clickbait - stay truthful
- MUST be in {language} language ONLY (not English or other languages)

Output ONLY the title in {language}, nothing else.',
  'You are a creative content specialist. Your task is to generate engaging article titles that:
1. Are compelling and click-worthy
2. Include or relate to the target keyword
3. Use power words and emotional triggers appropriately
4. Are concise and to the point
5. Match the specified tone and language
6. Never use English if another language is specified

CRITICAL: Output MUST be in the specified language ONLY. Do NOT use English or mix languages. The title should be original and creative, not just repeating the keyword.',
  '["keyword", "language", "tone"]',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  prompt_template = VALUES(prompt_template),
  system_prompt = VALUES(system_prompt),
  is_active = 1,
  updated_at = NOW();
