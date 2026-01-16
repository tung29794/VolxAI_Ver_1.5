-- ====================================================
-- UPDATE TOPLIST TITLE PROMPT TO INCLUDE ITEM_COUNT
-- ====================================================
-- Date: 2026-01-13
-- Purpose: Fix title generation to use exact item count selected by user
--
-- Issue: User selects 5 items but title says "Top 7"
-- Root Cause: Title prompt doesn't have {item_count} variable
-- Solution: Add {item_count} to prompt and force AI to use it
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- Update Toplist Title Prompt to FORCE using exact item_count
UPDATE ai_prompts 
SET 
  prompt_template = 'Generate a compelling toplist-style title in {language} for the topic: "{keyword}"

🚨🚨🚨 CRITICAL REQUIREMENT 🚨🚨🚨
THE TITLE MUST INCLUDE THE NUMBER {item_count}.
NOT {item_count} - 1. NOT {item_count} + 1. EXACTLY {item_count}.

TITLE FORMAT REQUIREMENTS:
Use one of these toplist formats with the number {item_count}:
- Top {item_count}...
- {item_count} Ways to...
- {item_count} Secrets about...
- {item_count} Things...
- {item_count} Tips for...
- {item_count} Questions about...
- {item_count} Reasons why...
- {item_count} Rules for...
- {item_count} Steps to...
- {item_count} Weirdest Things about...
- {item_count} Dos and Don''ts for...

EXAMPLES:
- If {item_count} = 5 and keyword = "món ngon hà nội" → "Top 5 Món Ngon Hà Nội Bạn Phải Thử"
- If {item_count} = 9 and keyword = "cách kinh doanh" → "9 Cách Kinh Doanh Hiệu Quả Cho Người Mới"
- If {item_count} = 10 and keyword = "địa điểm du lịch" → "Top 10 Địa Điểm Du Lịch Đẹp Nhất Việt Nam"

GUIDELINES:
- Make it catchy, specific, and click-worthy
- Naturally incorporate the keyword
- Match the format to content type
- THE NUMBER IN THE TITLE MUST BE {item_count}

LANGUAGE: {language}
OUTPUT: Return ONLY the title text, nothing else.

FINAL CHECK:
Does your title include the number {item_count}? If not, rewrite it.',
  
  system_prompt = 'You are an expert content strategist specializing in toplist articles and viral headlines. Generate engaging toplist-style titles that are SEO-friendly and click-worthy. The title MUST be in {language} language.

🚨 MANDATORY RULE 🚨
The title MUST include the number {item_count}.
If {item_count} = 5, use "Top 5" or "5 Ways" or "5 Tips".
If {item_count} = 9, use "Top 9" or "9 Ways" or "9 Tips".
If {item_count} = 10, use "Top 10" or "10 Ways" or "10 Tips".

Do NOT use any other number. Only {item_count}.',
  
  available_variables = '["keyword", "language", "item_count"]',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_toplist_title';

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
SELECT 
  feature_name,
  available_variables,
  CASE 
    WHEN available_variables LIKE '%item_count%' THEN '✅ HAS item_count'
    ELSE '❌ MISSING item_count'
  END as has_item_count,
  CASE 
    WHEN prompt_template LIKE '%{item_count}%' THEN '✅ USES {item_count}'
    ELSE '❌ NOT USING {item_count}'
  END as uses_item_count,
  SUBSTRING(prompt_template, 1, 200) as prompt_preview,
  updated_at
FROM ai_prompts
WHERE feature_name = 'generate_toplist_title';

-- Check all toplist prompts have item_count
SELECT 
  feature_name,
  CASE 
    WHEN available_variables LIKE '%item_count%' THEN '✅'
    ELSE '❌'
  END as has_var,
  CASE 
    WHEN prompt_template LIKE '%{item_count}%' THEN '✅'
    ELSE '❌'
  END as uses_var
FROM ai_prompts
WHERE feature_name LIKE '%toplist%'
ORDER BY feature_name;

-- ====================================================
-- END OF SCRIPT
-- ====================================================
