-- ====================================================
-- FIX TOPLIST ITEM COUNT ISSUE
-- ====================================================
-- Problem: When using "No Outline", AI writes 10 items instead of selected itemCount
--          When using "AI Outline", AI ignores the outline structure
-- Root Cause: Prompt template doesn't include {item_count} variable
--             Prompt doesn't emphasize following outline EXACTLY
-- Solution: Update prompt to include {item_count} and strengthen outline instructions
-- ====================================================

-- Update generate_toplist_article prompt
UPDATE ai_prompts
SET 
  prompt_template = 'Write a comprehensive toplist article about: "{keyword}"

ARTICLE REQUIREMENTS:
- Language: {language}
- Tone/Style: {tone}
- Length: {length_instruction}
- Number of Items: EXACTLY {item_count} items (numbered 1, 2, 3... {item_count})

{outline_instruction}

CRITICAL WRITING RULES:
1. **MUST create EXACTLY {item_count} numbered items** (1. 2. 3... {item_count}.) - NO MORE, NO LESS
2. If outline is provided, **FOLLOW IT EXACTLY** - use the same item titles and structure
3. Start with an engaging introduction paragraph (NO heading)
4. Use numbered H2 headings for each main item: <h2>1. [Title]</h2>, <h2>2. [Title]</h2>, etc.
5. Write {paragraphs_per_item} detailed paragraphs for EACH numbered item
6. Each paragraph should be {paragraph_words}+ words with comprehensive detail
7. Include H3 subsections where appropriate for depth
8. End with a strong conclusion section
9. Explain every point thoroughly with examples, analysis, and practical information
10. DO NOT write briefly - expand on every topic with valuable detail

⚠️ IMPORTANT: Count your items before finishing! You MUST have EXACTLY {item_count} numbered items (1-{item_count}).

Make sure the article reaches the minimum word count of {min_words} words by providing thorough explanations and examples for each item.

Write the complete article now:',
  
  system_prompt = 'You are a professional SEO content writer specializing in toplist articles (Top 10, 5 Ways, etc.).
Write in {language} language.
Tone: {tone}
{length_instruction}

TOPLIST ARTICLE STRUCTURE:
- Opening paragraph (no heading) - introduce the topic  
- **EXACTLY {item_count} numbered items** (1, 2, 3... {item_count}) with H2 headings
- Each item should have {paragraphs_per_item} detailed paragraphs
- Conclusion paragraph
- Use proper formatting with headings (<h2>, <h3>) and paragraphs (<p>)

CRITICAL RULES:
✅ Count your items - must be EXACTLY {item_count} items
✅ If outline provided, follow it EXACTLY (same titles, same order, same structure)
✅ Number items from 1 to {item_count}
❌ DO NOT write more than {item_count} items
❌ DO NOT write fewer than {item_count} items
❌ DO NOT ignore the provided outline',
  
  available_variables = '["keyword", "language", "tone", "length_instruction", "outline_instruction", "paragraphs_per_item", "paragraph_words", "min_words", "item_count"]',
  
  updated_at = NOW()
WHERE feature_name = 'generate_toplist_article';

-- ====================================================
-- VERIFICATION
-- ====================================================
SELECT 
  feature_name,
  display_name,
  available_variables,
  is_active,
  updated_at,
  SUBSTRING(prompt_template, 1, 200) as prompt_preview,
  SUBSTRING(system_prompt, 1, 200) as system_preview
FROM ai_prompts
WHERE feature_name = 'generate_toplist_article';

-- ====================================================
-- EXPECTED RESULT:
-- ====================================================
-- feature_name: generate_toplist_article
-- available_variables: ["keyword", "language", "tone", "length_instruction", "outline_instruction", "paragraphs_per_item", "paragraph_words", "min_words", "item_count"]
-- updated_at: [current timestamp]
-- Prompt now includes:
--   - EXACTLY {item_count} items (multiple mentions)
--   - FOLLOW IT EXACTLY (for outline adherence)
--   - Count verification reminder
-- ====================================================
