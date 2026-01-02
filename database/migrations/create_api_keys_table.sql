-- ====================================================================
-- Create API Keys Management Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider VARCHAR(100) NOT NULL COMMENT 'openai, serpapi, serper, zenserp, etc',
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
