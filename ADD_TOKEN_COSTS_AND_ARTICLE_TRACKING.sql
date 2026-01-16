-- ====================================================================
-- ADD TOKEN COSTS MANAGEMENT AND ARTICLE TRACKING
-- ====================================================================

-- Create table to manage token costs for each AI feature
-- NOTE: token_cost is now "tokens per 1000 words" instead of fixed cost per operation
CREATE TABLE IF NOT EXISTS ai_feature_token_costs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    feature_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier for the feature',
    feature_name VARCHAR(255) NOT NULL COMMENT 'Display name of the feature',
    token_cost INT NOT NULL DEFAULT 0 COMMENT 'Number of tokens per 1000 words (not per operation)',
    description TEXT COMMENT 'Description of what this feature does',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this feature is currently active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_feature_key (feature_key),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Manage token costs for each AI feature (token_cost = tokens per 1000 words)';

-- Insert default token costs for existing features
-- VALUES ARE NOW: tokens per 1000 words (not per operation)
INSERT INTO ai_feature_token_costs (feature_key, feature_name, token_cost, description) VALUES
-- Article generation features (major features)
('generate_article', 'Viết bài theo từ khóa', 15, 'Tạo bài viết hoàn chỉnh từ từ khóa - 15 tokens/1000 từ'),
('generate_toplist', 'Viết bài Toplist', 18, 'Tạo bài viết dạng toplist - 18 tokens/1000 từ'),
('generate_news', 'Viết tin tức', 20, 'Tìm kiếm và viết tin tức mới nhất - 20 tokens/1000 từ'),
('continue_article', 'Tiếp tục viết bài', 5, 'Tiếp tục viết phần còn lại của bài viết - 5 tokens/1000 từ'),

-- SEO features (medium features)
('generate_seo_title', 'AI Rewrite SEO Title', 500, 'Tạo tiêu đề SEO tối ưu - 500 tokens (fixed)'),
('generate_article_title', 'AI Rewrite Tiêu đề', 500, 'Viết lại tiêu đề bài viết - 500 tokens (fixed)'),
('generate_meta_description', 'AI Rewrite Giới thiệu ngắn', 800, 'Tạo mô tả meta description - 800 tokens (fixed)'),

-- Editor features (small features)
('ai_rewrite_text', 'AI Rewrite Text', 10, 'Viết lại đoạn văn bản được chọn - 10 tokens/1000 từ'),
('find_image', 'Find Image', 100, 'Tìm kiếm ảnh phù hợp theo từ khóa - 100 tokens (fixed)'),
('write_more', 'Write More', 8, 'Viết thêm nội dung từ đoạn văn hiện tại - 8 tokens/1000 từ')
ON DUPLICATE KEY UPDATE
    feature_name = VALUES(feature_name),
    token_cost = VALUES(token_cost),
    description = VALUES(description);

-- Add column to track articles created this month for each user
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS articles_used_this_month INT DEFAULT 0 COMMENT 'Number of articles created in current billing period',
ADD COLUMN IF NOT EXISTS last_article_reset_date TIMESTAMP NULL COMMENT 'Last time article count was reset';

-- Add word_count column to articles table for accurate token calculation
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS word_count INT DEFAULT 0 COMMENT 'Number of words in article content',
ADD COLUMN IF NOT EXISTS tokens_used INT DEFAULT 0 COMMENT 'Actual tokens consumed for this article';

-- Update existing records to set last_article_reset_date to current date if null
UPDATE user_subscriptions 
SET last_article_reset_date = NOW() 
WHERE last_article_reset_date IS NULL;

-- Create index for better performance
ALTER TABLE user_subscriptions 
ADD INDEX IF NOT EXISTS idx_articles_used (articles_used_this_month),
ADD INDEX IF NOT EXISTS idx_last_reset (last_article_reset_date);

-- ====================================================================
-- Stored Procedure: Check and Reset Article Count if needed
-- ====================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS check_and_reset_article_count$$

CREATE PROCEDURE check_and_reset_article_count(IN p_user_id INT)
BEGIN
    DECLARE v_last_reset TIMESTAMP;
    DECLARE v_days_since_reset INT;
    
    -- Get last reset date
    SELECT last_article_reset_date INTO v_last_reset
    FROM user_subscriptions
    WHERE user_id = p_user_id;
    
    -- Calculate days since last reset
    SET v_days_since_reset = DATEDIFF(NOW(), v_last_reset);
    
    -- If more than 30 days (1 month), reset the counter
    IF v_days_since_reset >= 30 THEN
        UPDATE user_subscriptions
        SET articles_used_this_month = 0,
            last_article_reset_date = NOW()
        WHERE user_id = p_user_id;
    END IF;
END$$

DELIMITER ;

-- ====================================================================
-- Function: Check if user can create article
-- ====================================================================
DELIMITER $$

DROP FUNCTION IF EXISTS can_user_create_article$$

CREATE FUNCTION can_user_create_article(p_user_id INT)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE v_articles_limit INT;
    DECLARE v_articles_used INT;
    DECLARE v_last_reset TIMESTAMP;
    DECLARE v_days_since_reset INT;
    
    -- Get user subscription info
    SELECT articles_limit, articles_used_this_month, last_article_reset_date
    INTO v_articles_limit, v_articles_used, v_last_reset
    FROM user_subscriptions
    WHERE user_id = p_user_id;
    
    -- If no subscription found, return FALSE
    IF v_articles_limit IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if need to reset (more than 30 days)
    SET v_days_since_reset = DATEDIFF(NOW(), v_last_reset);
    IF v_days_since_reset >= 30 THEN
        -- Reset will happen, so can create
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    IF v_articles_used < v_articles_limit THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END$$

DELIMITER ;

-- ====================================================================
-- Trigger: Increment article count when new article is created
-- ====================================================================
DELIMITER $$

DROP TRIGGER IF EXISTS after_article_insert$$

CREATE TRIGGER after_article_insert
AFTER INSERT ON articles
FOR EACH ROW
BEGIN
    -- Check and reset if needed
    CALL check_and_reset_article_count(NEW.user_id);
    
    -- Increment article count
    UPDATE user_subscriptions
    SET articles_used_this_month = articles_used_this_month + 1
    WHERE user_id = NEW.user_id;
END$$

DELIMITER ;

-- ====================================================================
-- View: User Article Usage Statistics
-- ====================================================================
CREATE OR REPLACE VIEW v_user_article_usage AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    us.plan_type,
    us.articles_limit,
    us.articles_used_this_month,
    (us.articles_limit - us.articles_used_this_month) as articles_remaining,
    us.last_article_reset_date,
    DATEDIFF(NOW(), us.last_article_reset_date) as days_since_reset,
    CASE 
        WHEN DATEDIFF(NOW(), us.last_article_reset_date) >= 30 THEN 'RESET_NEEDED'
        WHEN us.articles_used_this_month >= us.articles_limit THEN 'LIMIT_REACHED'
        ELSE 'ACTIVE'
    END as usage_status
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id;

-- ====================================================================
-- Test Data (Optional - Remove in production)
-- ====================================================================
-- SELECT * FROM ai_feature_token_costs;
-- SELECT * FROM v_user_article_usage;
-- SELECT can_user_create_article(1);
