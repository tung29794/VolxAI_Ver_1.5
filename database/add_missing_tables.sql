-- ========================================
-- Add Missing Tables for VolxAI
-- Run this if you haven't created subscription_plans and features tables yet
-- ========================================

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_key VARCHAR(50) NOT NULL UNIQUE COMMENT 'free, starter, grow, etc',
    plan_name VARCHAR(100) NOT NULL COMMENT 'Display name',
    description VARCHAR(500),
    monthly_price DECIMAL(10, 2) DEFAULT 0 COMMENT 'Monthly price in VND',
    annual_price DECIMAL(10, 2) COMMENT 'Annual price in VND',
    tokens_limit INT DEFAULT 10000 COMMENT 'Monthly token limit',
    articles_limit INT DEFAULT 2 COMMENT 'Monthly article limit',
    features JSON COMMENT 'Array of feature IDs included in this plan',
    icon_name VARCHAR(50) COMMENT 'Icon identifier (e.g., Gift, Sparkles, Zap, Crown)',
    display_order INT DEFAULT 0 COMMENT 'Order to display in UI',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_plan_key (plan_key),
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create features table
CREATE TABLE IF NOT EXISTS features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Feature name (e.g., "AI Editor")',
    description VARCHAR(500) COMMENT 'Feature description',
    display_order INT DEFAULT 0 COMMENT 'Order to display in comparison table',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default features
INSERT IGNORE INTO features (name, display_order, is_active) VALUES
('Viết bài bằng AI', 1, TRUE),
('AI Editor', 2, TRUE),
('Thêm hình ảnh bài viết', 3, TRUE),
('AI Chấm điểm SEO', 4, TRUE),
('Hỗ trợ 100+ ngôn ngữ', 5, TRUE),
('AI tìm hình ảnh', 6, TRUE),
('AI tìm bài tham khảo', 7, TRUE),
('AI tìm và viết bài theo Trend', 8, TRUE),
('Không giới hạn dùng bài', 9, TRUE),
('Hỗ trợ API', 10, TRUE),
('Webhook integration', 11, TRUE),
('Priority support', 12, TRUE);

-- Insert default plans
INSERT IGNORE INTO subscription_plans (
    plan_key,
    plan_name,
    description,
    monthly_price,
    annual_price,
    tokens_limit,
    articles_limit,
    icon_name,
    display_order,
    is_active,
    features
) VALUES
('free', 'Free', 'Thử nghiệm VolxAI', 0, 0, 10000, 2, 'Gift', 1, TRUE, JSON_ARRAY()),
('starter', 'Starter', 'Bắt đầu với VolxAI', 150000, 1500000, 400000, 60, 'Sparkles', 2, TRUE, JSON_ARRAY()),
('grow', 'Grow', 'Cho những người viết nhiều', 300000, 3000000, 1000000, 150, 'Zap', 3, TRUE, JSON_ARRAY()),
('pro', 'Pro', 'Cho nhà viết chuyên nghiệp', 475000, 4750000, 2000000, 300, 'Zap', 4, TRUE, JSON_ARRAY()),
('corp', 'Corp', 'Cho công ty nhỏ', 760000, 7600000, 4000000, 600, 'Crown', 5, TRUE, JSON_ARRAY()),
('premium', 'Premium', 'Giải pháp hoàn chỉnh cho doanh nghiệp', 1200000, 12000000, 6500000, 1000, 'Crown', 6, TRUE, JSON_ARRAY());

-- ========================================
-- Verify tables created
-- ========================================
-- Run these commands to verify:
-- SHOW TABLES LIKE 'features';
-- SHOW TABLES LIKE 'subscription_plans';
-- SELECT COUNT(*) FROM features;
-- SELECT COUNT(*) FROM subscription_plans;
