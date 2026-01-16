-- ====================================================================
-- FIX API Keys Management - Create api_keys Table
-- ====================================================================
-- 
-- Problem: Admin Dashboard > Quản lý API
--   - Adding API shows success message but data is NOT saved to database
--   - Root cause: Table 'api_keys' does not exist
-- 
-- Solution: Run this SQL script to create the table
-- 
-- How to run:
-- 1. Open phpMyAdmin
-- 2. Select your database (e.g., jybcaorr_volxai_db)
-- 3. Click "SQL" tab
-- 4. Copy & Paste this entire file content
-- 5. Click "Go" button
-- 
-- ====================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider VARCHAR(100) NOT NULL COMMENT 'openai, serpapi, serper, zenserp, anthropic, google-ai, etc',
    category VARCHAR(50) NOT NULL COMMENT 'content, search, etc',
    api_key VARCHAR(500) NOT NULL COMMENT 'The actual API key',
    description VARCHAR(255) COMMENT 'Description or label for this key',
    is_active BOOLEAN DEFAULT TRUE,
    quota_remaining INT COMMENT 'Remaining quota if applicable',
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_provider (provider),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Centralized management of all API keys used by the application';

-- ====================================================================
-- Verification Query
-- ====================================================================
-- 
-- Run this query to verify the table was created:
-- SELECT * FROM api_keys;
-- 
-- If table is created successfully, you should get:
-- "Result: Empty set (0.000 sec)"
--
-- ====================================================================
