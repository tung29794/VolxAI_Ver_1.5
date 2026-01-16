-- ====================================================================
-- UPDATE TOKEN COSTS - From Fixed to Word-Based Calculation
-- ====================================================================
-- This script updates token costs from "per operation" to "per 1000 words"
--
-- IMPORTANT: Run this AFTER ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql
-- ====================================================================

-- Update token costs to word-based values
UPDATE ai_feature_token_costs SET 
    token_cost = 15,
    description = 'Tạo bài viết hoàn chỉnh từ từ khóa - 15 tokens/1000 từ'
WHERE feature_key = 'generate_article';

UPDATE ai_feature_token_costs SET 
    token_cost = 18,
    description = 'Tạo bài viết dạng toplist - 18 tokens/1000 từ'
WHERE feature_key = 'generate_toplist';

UPDATE ai_feature_token_costs SET 
    token_cost = 20,
    description = 'Tìm kiếm và viết tin tức mới nhất - 20 tokens/1000 từ'
WHERE feature_key = 'generate_news';

UPDATE ai_feature_token_costs SET 
    token_cost = 5,
    description = 'Tiếp tục viết phần còn lại của bài viết - 5 tokens/1000 từ'
WHERE feature_key = 'continue_article';

UPDATE ai_feature_token_costs SET 
    token_cost = 10,
    description = 'Viết lại đoạn văn bản được chọn - 10 tokens/1000 từ'
WHERE feature_key = 'ai_rewrite_text';

UPDATE ai_feature_token_costs SET 
    token_cost = 8,
    description = 'Viết thêm nội dung từ đoạn văn hiện tại - 8 tokens/1000 từ'
WHERE feature_key = 'write_more';

-- Fixed cost features (không đổi)
UPDATE ai_feature_token_costs SET 
    description = 'Tạo tiêu đề SEO tối ưu - 500 tokens (fixed)'
WHERE feature_key = 'generate_seo_title';

UPDATE ai_feature_token_costs SET 
    description = 'Viết lại tiêu đề bài viết - 500 tokens (fixed)'
WHERE feature_key = 'generate_article_title';

UPDATE ai_feature_token_costs SET 
    description = 'Tạo mô tả meta description - 800 tokens (fixed)'
WHERE feature_key = 'generate_meta_description';

UPDATE ai_feature_token_costs SET 
    description = 'Tìm kiếm ảnh phù hợp theo từ khóa - 100 tokens (fixed)'
WHERE feature_key = 'find_image';

-- Verify changes
SELECT 
    feature_key,
    feature_name,
    token_cost,
    description,
    is_active
FROM ai_feature_token_costs
ORDER BY token_cost DESC;

-- Expected output:
-- generate_news: 20 tokens/1000 words
-- generate_toplist: 18 tokens/1000 words
-- generate_article: 15 tokens/1000 words
-- ai_rewrite_text: 10 tokens/1000 words
-- write_more: 8 tokens/1000 words
-- continue_article: 5 tokens/1000 words
-- generate_meta_description: 800 tokens (fixed)
-- generate_seo_title: 500 tokens (fixed)
-- generate_article_title: 500 tokens (fixed)
-- find_image: 100 tokens (fixed)
