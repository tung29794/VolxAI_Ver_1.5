-- ========================================
-- Migration: Create subscription_plans table
-- Description: Add support for dynamic service plan management
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
  features JSON COMMENT 'Array of features included in this plan',
  icon_name VARCHAR(50) COMMENT 'Icon identifier (e.g., Gift, Sparkles, Zap, Crown)',
  display_order INT DEFAULT 0 COMMENT 'Order to display in UI',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_plan_key (plan_key),
  INDEX idx_is_active (is_active),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Subscription plans that can be managed by admins';

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
(
  'free',
  'Free',
  'Thử nghiệm VolxAI',
  0,
  0,
  10000,
  2,
  'Gift',
  1,
  TRUE,
  '[
    {"name": "2 bài viết mỗi tháng", "included": true},
    {"name": "10.000 token", "included": true},
    {"name": "Viết bài bằng AI", "included": true},
    {"name": "AI Editor", "included": false},
    {"name": "Thêm hình ảnh bài viết", "included": false},
    {"name": "AI Chấm điểm SEO", "included": false},
    {"name": "Hỗ trợ 100+ ngôn ngữ", "included": false},
    {"name": "AI tìm hình ảnh", "included": false},
    {"name": "AI tìm bài tham khảo", "included": false},
    {"name": "AI tìm và viết bài theo Trend", "included": false},
    {"name": "Không giới hạn dùng bài", "included": false}
  ]'
),
(
  'starter',
  'Starter',
  'Bắt đầu với VolxAI',
  150000,
  1500000,
  400000,
  60,
  'Sparkles',
  2,
  TRUE,
  '[
    {"name": "60 bài viết mỗi tháng", "included": true},
    {"name": "400.000 token", "included": true},
    {"name": "Thêm hình ảnh bài viết", "included": true},
    {"name": "AI Chấm điểm SEO", "included": true},
    {"name": "Hỗ trợ 100+ ngôn ngữ", "included": true},
    {"name": "Viết bài bằng AI", "included": true},
    {"name": "AI Editor", "included": true},
    {"name": "AI tìm bài tham khảo", "included": true},
    {"name": "AI tìm hình ảnh", "included": true},
    {"name": "AI tìm và viết bài theo Trend", "included": true},
    {"name": "Không giới hạn dùng bài", "included": true}
  ]'
),
(
  'grow',
  'Grow',
  'Cho những người viết nhiều',
  300000,
  3000000,
  1000000,
  150,
  'Zap',
  3,
  TRUE,
  '[
    {"name": "150 bài viết mỗi tháng", "included": true},
    {"name": "1.000.000 token", "included": true},
    {"name": "Thêm hình ảnh bài viết", "included": true},
    {"name": "AI Chấm điểm SEO", "included": true},
    {"name": "Hỗ trợ 100+ ngôn ngữ", "included": true},
    {"name": "Viết bài bằng AI", "included": true},
    {"name": "AI Editor", "included": true},
    {"name": "AI tìm bài tham khảo", "included": true},
    {"name": "AI tìm hình ảnh", "included": true},
    {"name": "AI tìm và viết bài theo Trend", "included": true},
    {"name": "Không giới hạn dùng bài", "included": true}
  ]'
),
(
  'pro',
  'Pro',
  'Cho nhà viết chuyên nghiệp',
  475000,
  4750000,
  2000000,
  300,
  'Zap',
  4,
  TRUE,
  '[
    {"name": "300 bài viết mỗi tháng", "included": true},
    {"name": "2.000.000 token", "included": true},
    {"name": "Thêm hình ảnh bài viết", "included": true},
    {"name": "AI Chấm điểm SEO", "included": true},
    {"name": "Hỗ trợ 100+ ngôn ngữ", "included": true},
    {"name": "Viết bài bằng AI", "included": true},
    {"name": "AI Editor", "included": true},
    {"name": "AI tìm bài tham khảo", "included": true},
    {"name": "AI tìm hình ảnh", "included": true},
    {"name": "AI tìm và viết bài theo Trend", "included": true},
    {"name": "Không giới hạn dùng bài", "included": true}
  ]'
),
(
  'corp',
  'Corp',
  'Cho công ty nhỏ',
  760000,
  7600000,
  4000000,
  600,
  'Crown',
  5,
  TRUE,
  '[
    {"name": "600 bài viết mỗi tháng", "included": true},
    {"name": "4.000.000 token", "included": true},
    {"name": "Thêm hình ảnh bài viết", "included": true},
    {"name": "AI Chấm điểm SEO", "included": true},
    {"name": "Hỗ trợ 100+ ngôn ngữ", "included": true},
    {"name": "Viết bài bằng AI", "included": true},
    {"name": "AI Editor", "included": true},
    {"name": "AI tìm bài tham khảo", "included": true},
    {"name": "AI tìm hình ảnh", "included": true},
    {"name": "AI tìm và viết bài theo Trend", "included": true},
    {"name": "Không giới hạn dùng bài", "included": true}
  ]'
),
(
  'premium',
  'Premium',
  'Giải pháp hoàn chỉnh cho doanh nghiệp',
  1200000,
  12000000,
  6500000,
  1000,
  'Crown',
  6,
  TRUE,
  '[
    {"name": "1.000 bài viết mỗi tháng", "included": true},
    {"name": "6.500.000 token", "included": true},
    {"name": "Thêm hình ảnh bài viết", "included": true},
    {"name": "AI Chấm điểm SEO", "included": true},
    {"name": "Hỗ trợ 100+ ngôn ngữ", "included": true},
    {"name": "Viết bài bằng AI", "included": true},
    {"name": "AI Editor", "included": true},
    {"name": "AI tìm bài tham khảo", "included": true},
    {"name": "AI tìm hình ảnh", "included": true},
    {"name": "AI tìm và viết bài theo Trend", "included": true},
    {"name": "Không giới hạn dùng bài", "included": true}
  ]'
);

-- ========================================
-- END OF MIGRATION
-- ========================================
