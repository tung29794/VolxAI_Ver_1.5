-- ====================================================
-- UPDATE TOPLIST PROMPTS TO FIX ITEM COUNT ISSUE
-- ====================================================
-- Date: 2026-01-13
-- Purpose: Fix toplist article generation to respect item_count parameter
--
-- Issues Fixed:
-- 1. "No Outline" mode writes 10 items instead of selected count (e.g., 5)
-- 2. "AI Outline" mode generates correct outline but article doesn't follow it
--
-- Root Cause:
-- - Prompt template missing {item_count} variable
-- - Backend not passing item_count to article generation prompt
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- 1. Update Toplist Article Prompt to include {item_count}
UPDATE ai_prompts 
SET 
  prompt_template = 'Write a comprehensive toplist article about: "{keyword}"

ARTICLE REQUIREMENTS:
- Language: {language}
- Tone/Style: {tone}
- Length: {length_instruction}
- Number of items: {item_count} (MUST write exactly {item_count} items, no more, no less)
- Structure: Follow the provided outline exactly

{outline_instruction}

CRITICAL WRITING RULES:
- Start with an engaging introduction paragraph (NO heading)
- Write EXACTLY {item_count} numbered items (1, 2, 3... up to {item_count})
- Use numbered H2 headings for each main item (1. , 2. , 3. ...)
- Write {paragraphs_per_item} detailed paragraphs for EACH numbered item
- Each paragraph should be {paragraph_words}+ words with comprehensive detail
- Include H3 subsections where appropriate for depth
- End with a strong conclusion section
- Explain every point thoroughly with examples, analysis, and practical information
- DO NOT write briefly - expand on every topic with valuable detail
- DO NOT write more or fewer items than {item_count}

IMPORTANT: You MUST write exactly {item_count} items. If the outline shows {item_count} items, follow it exactly. Do not add extra items or skip any items.

Make sure the article reaches the minimum word count of {min_words} words by providing thorough explanations and examples for each item.

Write the complete article now:',
  
  system_prompt = 'You are a professional SEO content writer specializing in toplist articles (Top 10, 5 Ways, etc.).
Write in {language} language.
Tone: {tone}
{length_instruction}

CRITICAL REQUIREMENT: Write EXACTLY {item_count} numbered items. No more, no less.

TOPLIST ARTICLE STRUCTURE:
- Opening paragraph (no heading) - introduce the topic  
- Numbered items (1, 2, 3... up to {item_count}) with H2 headings
- Each item should have {paragraphs_per_item} detailed paragraphs
- Conclusion paragraph
- Use proper formatting with headings (<h2>, <h3>) and paragraphs (<p>)

STRICT RULE: If {item_count} = 5, write exactly 5 items. If {item_count} = 10, write exactly 10 items. Follow the number precisely.',
  
  available_variables = '["keyword", "language", "tone", "length_instruction", "outline_instruction", "paragraphs_per_item", "paragraph_words", "min_words", "item_count"]',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_toplist_article';

-- 2. Update Toplist Outline Prompt (already has {item_count} but ensure it's correct)
UPDATE ai_prompts 
SET 
  prompt_template = 'Create a detailed toplist outline for: "{keyword}"

ARTICLE STRUCTURE:
- Introduction paragraph (no heading)
- EXACTLY {item_count} numbered items with headings (no more, no less)
- Conclusion paragraph

OUTLINE FORMAT:
[intro] Brief introduction paragraph
[h2] 1. [First Item Title]
[h3] [Subsection 1.1 if needed]
[h3] [Subsection 1.2 if needed]
[h2] 2. [Second Item Title]
[h3] [Subsection 2.1 if needed]
[h3] [Subsection 2.2 if needed]
...continue for all {item_count} items (stop at item {item_count})
[h2] Kết luận / Conclusion

REQUIREMENTS:
- Language: {language}
- Tone: {tone}
- Number of items: EXACTLY {item_count} (STRICT - do not write more or fewer)
- Each item should be a substantial point (not just 1-2 words)
- Items should follow a logical order or ranking
- Use descriptive, engaging headings
- Each H2 can have {h3_per_h2} H3 subsections if the topic needs detail

IMPORTANT: If {item_count} = 5, create exactly 5 numbered items. If {item_count} = 10, create exactly 10 numbered items. Follow the number precisely.

Create the outline now:',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_toplist_outline';

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
SELECT 
  id,
  feature_name,
  display_name,
  available_variables,
  SUBSTRING(prompt_template, 1, 200) as prompt_preview,
  updated_at
FROM ai_prompts
WHERE feature_name IN ('generate_toplist_article', 'generate_toplist_outline')
ORDER BY feature_name;

-- Check if {item_count} is in available_variables
SELECT 
  feature_name,
  available_variables,
  CASE 
    WHEN available_variables LIKE '%item_count%' THEN '✅ HAS item_count'
    ELSE '❌ MISSING item_count'
  END as status
FROM ai_prompts
WHERE feature_name IN ('generate_toplist_article', 'generate_toplist_outline');

-- ====================================================
-- END OF SCRIPT
-- ====================================================
