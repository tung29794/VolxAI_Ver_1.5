-- VolxAI Database Initialization Script
-- Database: jybcaorr_lisacontentdbapi
-- This script creates all necessary tables for the VolxAI application

-- ====================================================================
-- Create Users Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    token_balance INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create Sessions Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create Password Reset Tokens Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create User Upgrades/Subscription Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    plan_name VARCHAR(50) NOT NULL COMMENT 'Starter, Grow, Pro, Corp, Premium',
    plan_price DECIMAL(10, 2),
    is_annual BOOLEAN DEFAULT FALSE,
    monthly_articles INT DEFAULT 0,
    monthly_tokens INT DEFAULT 0,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create Articles/Documents Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255),
    content LONGTEXT,
    ai_model VARCHAR(50) COMMENT 'Model used to generate',
    keyword VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft' COMMENT 'draft, published, archived',
    views_count INT DEFAULT 0,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create Token Usage History Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS token_usage_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT,
    tokens_used INT NOT NULL,
    action VARCHAR(100) COMMENT 'generate, edit, publish',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create Audit Log Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Create Subscription Plans Table
-- ====================================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Subscription plans that can be managed by admins';

-- ====================================================================
-- Create Features Table
-- ====================================================================
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

-- ====================================================================
-- Insert Default Features
-- ====================================================================
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

-- ====================================================================
-- Insert Default Plans
-- ====================================================================
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

-- ====================================================================
-- Create Image Search API Keys Management Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS image_search_api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider VARCHAR(50) NOT NULL COMMENT 'serpapi, serper.dev, zenserp',
    api_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    quota_remaining INT DEFAULT 100,
    quota_reset_date TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider (provider),
    INDEX idx_is_active (is_active),
    INDEX idx_quota_remaining (quota_remaining)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Manage multiple image search API providers and keys for quota rotation';

-- ====================================================================
-- Insert Default Image Search API Keys
-- ====================================================================
INSERT IGNORE INTO image_search_api_keys (provider, api_key, is_active, quota_remaining) VALUES
('serpapi', 'b7ecd9a1e490b34dda523bcb44cf6de1f6c7c2caa4b87c64e85857eca0b3fe46', TRUE, 100),
('serpapi', '90ecd9a1e490b34dda523bcb44cf6de1f6c7c2caa4b87c64e85857eca0b3fe46', TRUE, 100),
('serper.dev', '369f38890dca6cc3a072553db013737f2994baa6', TRUE, 100),
('serper.dev', '459f38890dca6cc3a072553db013737f2994baa6', TRUE, 100),
('zenserp', '695dbee0-e235-11f0-9b40-3f81023abf46', TRUE, 100),
('zenserp', '27358193-e235-11f0-9b40-3f81023abf46', TRUE, 100);

-- ====================================================================
-- Create AI Rewrite History Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS ai_rewrite_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_text LONGTEXT NOT NULL,
    rewritten_text LONGTEXT NOT NULL,
    style VARCHAR(50) NOT NULL COMMENT 'standard, shorter, longer, easy, creative, funny, casual, friendly, professional',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_style (style),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log of AI text rewriting requests for analysis and tracking';

-- ====================================================================
-- Verify tables created
-- ====================================================================
-- Run this query to verify all tables were created:
-- SHOW TABLES;
-- DESCRIBE users;
-- DESCRIBE sessions;
-- DESCRIBE password_reset_tokens;
-- DESCRIBE user_subscriptions;
-- DESCRIBE articles;
-- DESCRIBE token_usage_history;
-- DESCRIBE audit_logs;
-- DESCRIBE ai_rewrite_history;
