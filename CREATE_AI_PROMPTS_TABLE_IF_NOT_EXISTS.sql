-- ================================================================
-- Create ai_prompts Table
-- ================================================================
-- This script creates the ai_prompts table if it doesn't exist
-- Run this BEFORE importing prompts
-- ================================================================

CREATE TABLE IF NOT EXISTS ai_prompts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  system_prompt TEXT,
  available_variables JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_feature_name (feature_name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Verify table creation
-- ================================================================
SELECT 'Table ai_prompts created successfully!' as message;
DESCRIBE ai_prompts;
