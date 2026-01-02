-- ========================================
-- VolxAI Database Schema - phpMyAdmin Import
-- ========================================
-- 
-- Hướng dẫn:
-- 1. Mở phpMyAdmin
-- 2. Chọn database: jybcaorr_volxai_db
-- 3. Click tab "SQL"
-- 4. Copy toàn bộ nội dung file này
-- 5. Paste vào phpMyAdmin SQL text area
-- 6. Click "Go" button
-- 
-- ========================================

-- 1. USERS TABLE - Lưu trữ tài khoản người dùng
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  bio TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_created_at (created_at),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SESSIONS TABLE - Lưu trữ authentication tokens
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  refresh_token VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ARTICLES TABLE - Lưu trữ blog posts & content
-- ========================================
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  content LONGTEXT,
  excerpt TEXT,
  featured_image VARCHAR(500),
  featured_image_alt VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description VARCHAR(500),
  seo_keywords VARCHAR(500),
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  views INT DEFAULT 0,
  reading_time INT,
  category VARCHAR(100),
  tags VARCHAR(500),
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_published_at (published_at),
  INDEX idx_created_at (created_at),
  FULLTEXT INDEX ft_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. USER SUBSCRIPTIONS TABLE - Lưu trữ plan & billing info
-- ========================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  plan_type ENUM('free', 'starter', 'grow', 'professional') DEFAULT 'free',
  tokens_limit INT DEFAULT 10000,
  articles_limit INT DEFAULT 2,
  features JSON,
  billing_cycle ENUM('monthly', 'annual') DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT TRUE,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method VARCHAR(50),
  payment_id VARCHAR(100),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_plan_type (plan_type),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. USER USAGE TABLE - Theo dõi sử dụng hàng tháng
-- ========================================
CREATE TABLE IF NOT EXISTS user_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  month DATE NOT NULL,
  tokens_used INT DEFAULT 0,
  articles_created INT DEFAULT 0,
  requests_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX unique_user_month (user_id, month),
  INDEX idx_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PASSWORD RESET TOKENS TABLE - Reset mật khẩu
-- ========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ACTIVITY LOG TABLE - Audit log hoạt động người dùng
-- ========================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SUBSCRIPTION HISTORY TABLE - Lịch sử nâng cấp gói
-- ========================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_plan ENUM('free', 'starter', 'grow', 'professional') DEFAULT 'free',
  to_plan ENUM('free', 'starter', 'grow', 'professional') NOT NULL,
  amount INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'VND',
  billing_cycle ENUM('monthly', 'annual') DEFAULT 'monthly',
  status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'completed',
  transaction_id VARCHAR(100),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- SAMPLE DATA (OPTIONAL - for testing)
-- ========================================

-- Insert a test user for testing registration/login
-- DELETE AFTER TESTING!
INSERT IGNORE INTO users (id, email, username, password, full_name, is_active, is_verified) 
VALUES (
  1, 
  'admin@volxai.com', 
  'admin', 
  '$2a$10$YmFzZTY0ZW5jb2RlZGhhc2gk',  -- placeholder hashed password
  'Admin User', 
  TRUE, 
  TRUE
);

-- Insert test subscription
INSERT IGNORE INTO user_subscriptions (user_id, plan_type, tokens_limit, articles_limit, is_active)
VALUES (1, 'professional', 400000, 100, TRUE);

-- Insert test subscription history
INSERT IGNORE INTO subscription_history (user_id, from_plan, to_plan, amount, currency, billing_cycle, status, created_at)
VALUES
  (1, 'free', 'starter', 150000, 'VND', 'monthly', 'completed', DATE_SUB(NOW(), INTERVAL 90 DAY)),
  (1, 'starter', 'grow', 300000, 'VND', 'monthly', 'completed', DATE_SUB(NOW(), INTERVAL 60 DAY)),
  (1, 'grow', 'professional', 475000, 'VND', 'monthly', 'completed', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- ========================================
-- END OF SCHEMA
-- ========================================
--
-- Nếu import thành công sẽ thấy:
-- "8 table(s) created successfully"
--
-- Kiểm tra:
-- 1. phpMyAdmin sidebar → jybcaorr_volxai_db
-- 2. Phải thấy 8 tables:
--    - users
--    - sessions
--    - articles
--    - user_subscriptions
--    - user_usage
--    - password_reset_tokens
--    - activity_log
--    - subscription_history
--
