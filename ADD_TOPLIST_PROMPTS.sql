-- ====================================================
-- ADD TOPLIST PROMPTS TO DATABASE
-- ====================================================
-- Date: 2026-01-08
-- Purpose: Add prompts for Toplist Article Generation feature
--
-- This script adds 2 new prompts:
-- 1. generate_toplist_title: Generates toplist-style titles (Top 10, 5 Ways, etc.)
-- 2. generate_toplist_outline: Generates numbered list outline (1-n format)
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- 1. Generate Toplist Title
INSERT INTO ai_prompts (
  feature_name,
  display_name,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_toplist_title',
  'Tạo tiêu đề Toplist',
  'Generate a compelling toplist-style title in {language} for the topic: "{keyword}"

TITLE FORMAT REQUIREMENTS:
Use one of these toplist formats:
- Top [number]...
- [number] Ways to...
- [number] Secrets about...
- [number] Things...
- [number] Tips for...
- [number] Questions about...
- [number] Reasons why...
- [number] Rules for...
- [number] Steps to...
- [number] Weirdest Things about...
- [number] Dos and Don''ts for...

GUIDELINES:
- Choose a number between 3-15 items (most common: 5, 7, 10)
- Make it catchy, specific, and click-worthy
- Naturally incorporate the keyword
- Match the format to content type (e.g., "Top 10" for rankings, "5 Ways" for methods)

LANGUAGE: {language}
OUTPUT: Return ONLY the title text, nothing else.',
  'You are an expert content strategist specializing in toplist articles and viral headlines. Generate engaging toplist-style titles that are SEO-friendly and click-worthy. The title MUST be in {language} language.',
  '["keyword", "language"]',
  TRUE,
  NOW(),
  NOW()
);

-- 2. Generate Toplist Outline
INSERT INTO ai_prompts (
  feature_name,
  display_name,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_toplist_outline',
  'Tạo dàn ý Toplist',
  'Create a detailed toplist outline for: "{keyword}"

ARTICLE STRUCTURE:
- Introduction paragraph (no heading)
- {item_count} numbered items with headings
- Conclusion paragraph

OUTLINE FORMAT:
[intro] Brief introduction paragraph
[h2] 1. [First Item Title]
[h3] [Subsection 1.1 if needed]
[h3] [Subsection 1.2 if needed]
[h2] 2. [Second Item Title]
[h3] [Subsection 2.1 if needed]
[h3] [Subsection 2.2 if needed]
...continue for all {item_count} items
[h2] Kết luận / Conclusion

REQUIREMENTS:
- Language: {language}
- Tone: {tone}
- Number of items: {item_count}
- Each item should be a substantial point (not just 1-2 words)
- Items should follow a logical order or ranking
- Use descriptive, engaging headings
- Each H2 can have {h3_per_h2} H3 subsections if the topic needs detail

Create the outline now:',
  'You are an expert SEO content strategist specializing in toplist articles. Create well-structured, engaging outlines with numbered items that flow logically.',
  '["keyword", "language", "tone", "item_count", "h3_per_h2"]',
  TRUE,
  NOW(),
  NOW()
);

-- 3. Generate Toplist Article (NEW)
INSERT INTO ai_prompts (
  feature_name,
  display_name,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_toplist_article',
  'Tạo nội dung bài Toplist',
  'Write a comprehensive toplist article about: "{keyword}"

ARTICLE REQUIREMENTS:
- Language: {language}
- Tone/Style: {tone}
- Length: {length_instruction}
- Structure: Follow the provided outline exactly

{outline_instruction}

CRITICAL WRITING RULES:
- Start with an engaging introduction paragraph (NO heading)
- Use numbered H2 headings for each main item (1. , 2. , 3. ...)
- Write {paragraphs_per_item} detailed paragraphs for EACH numbered item
- Each paragraph should be {paragraph_words}+ words with comprehensive detail
- Include H3 subsections where appropriate for depth
- End with a strong conclusion section
- Explain every point thoroughly with examples, analysis, and practical information
- DO NOT write briefly - expand on every topic with valuable detail

Make sure the article reaches the minimum word count of {min_words} words by providing thorough explanations and examples for each item.

Write the complete article now:',
  'You are a professional SEO content writer specializing in toplist articles (Top 10, 5 Ways, etc.).
Write in {language} language.
Tone: {tone}
{length_instruction}

TOPLIST ARTICLE STRUCTURE:
- Opening paragraph (no heading) - introduce the topic  
- Numbered items (1, 2, 3...) with H2 headings
- Each item should have {paragraphs_per_item} detailed paragraphs
- Conclusion paragraph
- Use proper formatting with headings (<h2>, <h3>) and paragraphs (<p>)',
  '["keyword", "language", "tone", "length_instruction", "outline_instruction", "paragraphs_per_item", "paragraph_words", "min_words"]',
  TRUE,
  NOW(),
  NOW()
);

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
SELECT 
  id,
  feature_name,
  display_name,
  is_active,
  created_at
FROM ai_prompts
WHERE feature_name IN ('generate_toplist_title', 'generate_toplist_outline', 'generate_toplist_article')
ORDER BY id DESC;

-- ====================================================
-- END OF SCRIPT
-- ====================================================
