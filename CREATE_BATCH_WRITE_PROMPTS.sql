-- ============================================================
-- CREATE BATCH WRITE DEDICATED PROMPTS
-- ============================================================
-- Purpose: Create separate prompts for Bulk Write feature
-- to avoid affecting other features (single write, toplist, news)
--
-- Features that use different prompt variables:
-- 1. "AI viết bài theo từ khoá" → {language_instruction}
-- 2. "AI viết bài dạng toplist" → {language_instruction}
-- 3. "AI Viết bài tin tức" → {language}
-- 4. "Viết bài hàng loạt" → {language} (NEW - Batch specific)
--
-- Batch Write Prompts ONLY use {language}, NOT {language_instruction}
-- ============================================================

-- Insert 4 dedicated prompts for Batch Write
INSERT INTO ai_prompts (
  feature_name,
  feature_label,
  description,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES

-- 1. Batch Write Article Title
(
  'batch_write_article_title',
  'Batch Write - Article Title',
  'Generate article title for batch write feature (uses {language} only)',
  'Generate an engaging article title for the keyword: "{keyword}". Language: {language}

The title should be:
- Between 50-60 characters
- Include the keyword naturally
- Be compelling and click-worthy
- Match search intent
- Use power words when appropriate

Return ONLY the title, without quotes or extra text.',
  'You are a professional content writer. Generate a compelling, SEO-friendly title for an article.
IMPORTANT: You MUST write the title in {language} language ONLY.
Return ONLY the title text, nothing else.',
  '["keyword", "language", "tone"]',
  TRUE,
  NOW(),
  NOW()
),

-- 2. Batch Write SEO Title
(
  'batch_write_seo_title',
  'Batch Write - SEO Title',
  'Generate SEO title for batch write feature (uses {language} only)',
  'Create an SEO-optimized title for the keyword: "{keyword}". Language: {language}

The title should be:
- Between 50-60 characters
- Include the keyword naturally
- Be compelling and click-worthy
- Match search intent
- Use power words when appropriate

Return ONLY the title, without quotes or extra text.',
  'You are an SEO expert specializing in creating compelling, click-worthy titles. Language: {language}
Create titles that rank well and attract clicks.
CRITICAL: Output MUST be in {language} language ONLY.',
  '["keyword", "language"]',
  TRUE,
  NOW(),
  NOW()
),

-- 3. Batch Write Meta Description
(
  'batch_write_meta_description',
  'Batch Write - Meta Description',
  'Generate meta description for batch write feature (uses {language} only)',
  'Create an SEO-optimized meta description for keyword: "{keyword}". Language: {language}

Requirements:
- Include the keyword naturally
- Keep it between 150-160 characters
- Make it compelling and informative
- Encourage clicks from search results
- Write in {language} language ONLY

Return ONLY the meta description, without quotes or extra text.',
  'You are an SEO expert specializing in meta descriptions. Language: {language}
Create descriptions that improve click-through rates and accurately represent the content.
CRITICAL: Output MUST be in {language} language ONLY.',
  '["keyword", "language"]',
  TRUE,
  NOW(),
  NOW()
),

-- 4. Batch Write Article Content
(
  'batch_write_article_content',
  'Batch Write - Article Content',
  'Generate article content for batch write feature (uses {language} only)',
  'Write a comprehensive article about "{keyword}". Language: {language}

Guidelines:
- Write in {language} language ONLY
- Length: {length} (short = 1-2 paragraphs, medium = 3-5 paragraphs, long = 5+ paragraphs)
- Tone: {tone}
- Include the keyword naturally throughout
- Use H2 headings to structure content
- IMPORTANT: Each paragraph should NOT exceed 100 characters
- Use clear, easy-to-read sentences
- End with a conclusion

Requirements for EACH PARAGRAPH:
✅ Maximum 100 characters per line
✅ Break long sentences into shorter ones
✅ Use short paragraphs for readability
✅ Use numbered lists or bullet points when appropriate

Return ONLY the HTML content (wrapped in <div></div>), no frontmatter.',
  'You are a professional SEO content writer. Language: {language}
Write engaging, well-structured articles that rank well on search engines.
CRITICAL REQUIREMENTS:
1. EVERY paragraph must follow the 100-character limit per line
2. Write ONLY in {language} language
3. Use HTML tags for formatting (H2, P, UL, LI, etc)
4. Make content scannable with short paragraphs
5. Break complex sentences into simpler ones',
  '["keyword", "language", "tone", "length", "outline"]',
  TRUE,
  NOW(),
  NOW()
);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check if prompts were created
SELECT feature_name, feature_label, LENGTH(prompt_template) as prompt_length, is_active 
FROM ai_prompts 
WHERE feature_name LIKE 'batch_write%'
ORDER BY feature_name;

-- ============================================================
-- Notes
-- ============================================================
-- ✅ These prompts use {language} instead of {language_instruction}
-- ✅ Specific for batch write, won't affect other features
-- ✅ Content prompt includes 100-character line limit guidance
-- ✅ All outputs must be in selected language ONLY
-- ✅ Meta descriptions and titles optimized for bulk processing

