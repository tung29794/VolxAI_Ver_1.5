-- ====================================================================
-- Add AI Rewrite History Table
-- ====================================================================
-- Migration to add a table for tracking AI rewrite requests

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
