-- ========================================
-- CHECK TOKEN COSTS CONFIGURATION
-- ========================================

-- 1. Check current token costs for article generation
SELECT 
    feature_key,
    feature_name,
    token_cost_per_1000_words,
    is_fixed_cost,
    is_active,
    description
FROM ai_feature_token_costs
WHERE feature_key IN ('generate_article', 'generate_toplist', 'generate_article_title', 'generate_seo_title', 'generate_meta_description')
ORDER BY feature_key;

-- Expected results:
-- generate_article: 15 tokens/1000 words (is_fixed_cost = FALSE)
-- generate_toplist: 15 tokens/1000 words (is_fixed_cost = FALSE)
-- generate_article_title: 500 tokens (is_fixed_cost = TRUE)
-- generate_seo_title: 500 tokens (is_fixed_cost = TRUE)
-- generate_meta_description: 800 tokens (is_fixed_cost = TRUE)

-- ========================================
-- 2. Check AI model cost multipliers
SELECT 
    model_id,
    display_name,
    provider,
    cost_multiplier,
    is_active
FROM ai_models
WHERE is_active = TRUE
ORDER BY cost_multiplier DESC;

-- Expected for Gemini 2.5 Flash:
-- model_id: gemini-2.5-flash
-- cost_multiplier: 3.00

-- ========================================
-- 3. Test calculation manually
-- ========================================

-- Example: 1768 words article with Gemini 2.5 Flash
-- Formula: (wordCount / 1000) * tokenCostPer1000Words * costMultiplier
-- Calculation: (1768 / 1000) * 15 * 3.0 = 79.56 → 80 tokens

SELECT 
    'Article Content' as item,
    1768 as word_count,
    15 as token_cost_per_1000,
    3.0 as cost_multiplier,
    CEIL((1768 / 1000) * 15 * 3.0) as calculated_tokens
UNION ALL
SELECT 
    'Article Title' as item,
    10 as word_count,  -- Example title
    15 as token_cost_per_1000,
    3.0 as cost_multiplier,
    CEIL((10 / 1000) * 15 * 3.0) as calculated_tokens;

-- Expected total for 1768-word article:
-- Article: 80 tokens
-- Title: 1 token
-- Total: 81 tokens (approximately)

-- ========================================
-- 4. Check if config is wrong - UPDATE IF NEEDED
-- ========================================

-- If the token_cost_per_1000_words is currently 100 instead of 15, run this:
/*
UPDATE ai_feature_token_costs
SET 
    token_cost_per_1000_words = 15,
    description = 'Tạo bài viết hoàn chỉnh từ từ khóa - 15 tokens/1000 từ (UPDATED)',
    updated_at = NOW()
WHERE feature_key = 'generate_article'
AND token_cost_per_1000_words != 15;

-- Verify the update
SELECT 
    feature_key,
    token_cost_per_1000_words,
    updated_at,
    description
FROM ai_feature_token_costs
WHERE feature_key = 'generate_article';
*/

-- ========================================
-- 5. Check recent article token usage
-- ========================================

SELECT 
    a.id,
    a.title,
    a.word_count,
    a.tokens_used,
    a.created_at,
    u.email as user_email,
    -- Calculate what it SHOULD be with 15 tokens/1000 words and 3.0x multiplier
    CEIL((a.word_count / 1000) * 15 * 3.0) as expected_tokens_gemini,
    -- Difference
    (a.tokens_used - CEIL((a.word_count / 1000) * 15 * 3.0)) as difference
FROM articles a
JOIN users u ON a.user_id = u.id
WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY a.created_at DESC
LIMIT 10;

-- ========================================
-- 6. DIAGNOSIS
-- ========================================

-- If token_cost_per_1000_words is 100:
-- Calculation: (1768 / 1000) * 100 * 3.0 = 530 tokens ❌ WRONG!

-- If token_cost_per_1000_words is 15:
-- Calculation: (1768 / 1000) * 15 * 3.0 = 79.56 → 80 tokens ✅ CORRECT!

-- But user said only 183 tokens were deducted
-- This suggests there might be additional tokens from:
-- 1. Article title generation
-- 2. SEO title generation
-- 3. Meta description generation
-- 4. Image search
-- 5. Continue article (if triggered)

-- To see actual calculation, check server logs for:
-- "📊 Token Calculation for generate_article:"

SELECT '========================================' as '';
SELECT 'SUMMARY:' as '';
SELECT '========================================' as '';
SELECT 'If token_cost_per_1000_words = 100 → Bug! Should be 15' as diagnosis;
SELECT 'If token_cost_per_1000_words = 15 → Calculation is correct' as diagnosis;
SELECT 'User report: 183 tokens deducted for 1768-word article' as user_report;
SELECT 'Expected with 15 tokens/1000: ~80 tokens' as expected;
SELECT 'Expected with 100 tokens/1000: ~530 tokens' as wrong_calculation;
SELECT 'Check server logs for actual calculation details' as next_step;
