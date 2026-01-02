-- ========================================
-- Migration: Create global features table
-- Description: Master list of features that can be assigned to subscription plans
-- ========================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Master list of features for subscription plans';

-- Insert default features from existing data
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

-- ========================================
-- END OF MIGRATION
-- ========================================
