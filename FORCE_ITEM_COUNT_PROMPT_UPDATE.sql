-- ====================================================
-- FORCE ITEM COUNT - STRONGEST PROMPT UPDATE
-- ====================================================
-- Date: 2026-01-13
-- Purpose: Make AI ABSOLUTELY follow item_count with EXTREME emphasis
--
-- Issue: User selects 9 items but AI writes 10 items
-- Solution: Repeat item_count requirement in EVERY section with CAPS and examples
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- Update Article Generation Prompt with MAXIMUM FORCE
UPDATE ai_prompts 
SET 
  prompt_template = 'Write a comprehensive toplist article about: "{keyword}"

⚠️⚠️⚠️ CRITICAL REQUIREMENT - READ CAREFULLY ⚠️⚠️⚠️
YOU MUST WRITE EXACTLY {item_count} NUMBERED ITEMS.
NOT {item_count} + 1. NOT {item_count} - 1. EXACTLY {item_count}.

Example:
- If {item_count} = 5 → Write items 1, 2, 3, 4, 5 (STOP at 5)
- If {item_count} = 9 → Write items 1, 2, 3, 4, 5, 6, 7, 8, 9 (STOP at 9)
- If {item_count} = 10 → Write items 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 (STOP at 10)

ARTICLE REQUIREMENTS:
- Language: {language}
- Tone/Style: {tone}
- Length: {length_instruction}
- Number of items: EXACTLY {item_count} items (COUNT THEM: 1, 2, 3... {item_count})
- Structure: Follow the provided outline exactly

{outline_instruction}

CRITICAL WRITING RULES:
1. Start with an engaging introduction paragraph (NO heading)
2. Write EXACTLY {item_count} numbered items - NO MORE, NO LESS
3. Use H2 headings: <h2>1. Title</h2>, <h2>2. Title</h2>... up to <h2>{item_count}. Title</h2>
4. STOP WRITING after item number {item_count}
5. Write {paragraphs_per_item} detailed paragraphs for EACH numbered item
6. Each paragraph should be {paragraph_words}+ words with comprehensive detail
7. Include H3 subsections where appropriate for depth
8. End with a strong conclusion section AFTER item {item_count}
9. Explain every point thoroughly with examples, analysis, and practical information

⚠️ STOPPING RULE ⚠️
When you finish writing item {item_count}, IMMEDIATELY write the conclusion.
DO NOT write item {item_count} + 1.
DO NOT add extra items "for good measure".
{item_count} means {item_count}. Count your H2 headings.

OUTPUT FORMAT:
<p>Introduction paragraph...</p>

<h2>1. [First item title]</h2>
<p>Content for item 1...</p>

<h2>2. [Second item title]</h2>
<p>Content for item 2...</p>

...continue until...

<h2>{item_count}. [Last item title]</h2>
<p>Content for item {item_count}...</p>

<h2>Kết luận / Conclusion</h2>
<p>Conclusion paragraph...</p>

FINAL CHECK BEFORE SUBMITTING:
- Count your H2 numbered headings (excluding intro/conclusion)
- The count MUST be exactly {item_count}
- If you have {item_count} + 1 or more, DELETE the extra items
- If you have less than {item_count}, ADD missing items

Make sure the article reaches the minimum word count of {min_words} words by providing thorough explanations and examples for each item.

Write the complete article now with EXACTLY {item_count} items:',
  
  system_prompt = 'You are a professional SEO content writer specializing in toplist articles (Top 10, 5 Ways, etc.).
Write in {language} language.
Tone: {tone}
{length_instruction}

🚨🚨🚨 ABSOLUTE RULE - NO EXCEPTIONS 🚨🚨🚨
WRITE EXACTLY {item_count} NUMBERED ITEMS. 
NOT ONE MORE. NOT ONE LESS.
COUNT YOUR H2 HEADINGS BEFORE YOU FINISH.

Example enforcement:
- If {item_count} = 5 → Your article has exactly 5 numbered H2 headings (1, 2, 3, 4, 5)
- If {item_count} = 9 → Your article has exactly 9 numbered H2 headings (1, 2, 3, 4, 5, 6, 7, 8, 9)
- If {item_count} = 10 → Your article has exactly 10 numbered H2 headings (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

TOPLIST ARTICLE STRUCTURE:
- Opening paragraph (no heading) - introduce the topic  
- Numbered items with H2 headings: <h2>1. Title</h2>, <h2>2. Title</h2>... <h2>{item_count}. Title</h2>
- Each item should have {paragraphs_per_item} detailed paragraphs
- Conclusion paragraph with H2 heading
- Use proper formatting with headings (<h2>, <h3>) and paragraphs (<p>)

QUALITY CHECK:
Before you submit your article:
1. Count the numbered H2 headings (excluding intro/conclusion)
2. Verify the count equals {item_count}
3. If count ≠ {item_count}, FIX IT before submitting

STRICT RULE: 
The number {item_count} is non-negotiable. 
If {item_count} = 9, write 9 items.
If {item_count} = 10, write 10 items.
Follow the number EXACTLY.',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_toplist_article';

-- Update Outline Prompt with same level of FORCE
UPDATE ai_prompts 
SET 
  prompt_template = 'Create a detailed toplist outline for: "{keyword}"

⚠️⚠️⚠️ CRITICAL - YOU MUST CREATE EXACTLY {item_count} NUMBERED ITEMS ⚠️⚠️⚠️

Example:
- If {item_count} = 5 → Create items 1, 2, 3, 4, 5 (STOP)
- If {item_count} = 9 → Create items 1, 2, 3, 4, 5, 6, 7, 8, 9 (STOP)
- If {item_count} = 10 → Create items 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 (STOP)

ARTICLE STRUCTURE:
- Introduction paragraph (no heading)
- EXACTLY {item_count} numbered items with headings (count them: 1, 2, 3... {item_count})
- Conclusion paragraph

OUTLINE FORMAT:
[intro] Brief introduction paragraph
[h2] 1. [First Item Title]
[h3] [Subsection 1.1 if needed]
[h3] [Subsection 1.2 if needed]
[h2] 2. [Second Item Title]
[h3] [Subsection 2.1 if needed]
[h3] [Subsection 2.2 if needed]
[h2] 3. [Third Item Title]
...continue counting: 4, 5, 6, 7, 8... until you reach {item_count}
[h2] {item_count}. [Last Item Title]
[h2] Kết luận / Conclusion

⚠️ STOP AFTER ITEM {item_count} ⚠️

REQUIREMENTS:
- Language: {language}
- Tone: {tone}
- Number of items: EXACTLY {item_count} (MANDATORY - count your numbered items before submitting)
- Each item should be a substantial point (not just 1-2 words)
- Items should follow a logical order or ranking
- Use descriptive, engaging headings
- Each H2 can have {h3_per_h2} H3 subsections if the topic needs detail

FINAL CHECK BEFORE SUBMITTING:
1. Count your [h2] numbered items (excluding intro/conclusion)
2. The count MUST be exactly {item_count}
3. If you have more than {item_count}, DELETE extra items
4. If you have less than {item_count}, ADD missing items

IMPORTANT: {item_count} = {item_count}. Not {item_count} - 1. Not {item_count} + 1. Exactly {item_count}.

Create the outline now with EXACTLY {item_count} numbered items:',
  
  system_prompt = 'You are an expert SEO content strategist specializing in toplist articles.

🚨🚨🚨 MANDATORY RULE 🚨🚨🚨
CREATE EXACTLY {item_count} NUMBERED ITEMS IN THE OUTLINE.
COUNT YOUR NUMBERED [h2] LINES BEFORE YOU SUBMIT.

Example:
- {item_count} = 5 → Outline has 5 numbered [h2] items
- {item_count} = 9 → Outline has 9 numbered [h2] items
- {item_count} = 10 → Outline has 10 numbered [h2] items

QUALITY CHECK:
1. Count numbered [h2] items (excluding [intro] and conclusion)
2. Verify count = {item_count}
3. If count ≠ {item_count}, fix it NOW

The number {item_count} is LAW. Follow it exactly.',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_toplist_outline';

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
SELECT 
  feature_name,
  SUBSTRING(prompt_template, 1, 300) as prompt_preview,
  CASE 
    WHEN prompt_template LIKE '%EXACTLY {item_count}%' THEN '✅ HAS EXACTLY emphasis'
    ELSE '❌ MISSING EXACTLY emphasis'
  END as has_exact_emphasis,
  updated_at
FROM ai_prompts
WHERE feature_name IN ('generate_toplist_article', 'generate_toplist_outline')
ORDER BY feature_name;

-- ====================================================
-- END OF SCRIPT
-- ====================================================
