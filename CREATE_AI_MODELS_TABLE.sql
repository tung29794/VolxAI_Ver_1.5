-- Create table for AI Models management
CREATE TABLE IF NOT EXISTS ai_models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Name shown to users (e.g., "GPT 4.1 MINI")',
  provider ENUM('openai', 'google-ai', 'anthropic', 'other') NOT NULL COMMENT 'AI provider (openai, google-ai, etc.)',
  model_id VARCHAR(100) NOT NULL COMMENT 'Actual model ID used in API calls (e.g., "gpt-3.5-turbo")',
  description TEXT COMMENT 'Model description for admin reference',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this model is available for users',
  display_order INT DEFAULT 0 COMMENT 'Order to display in dropdown (lower = first)',
  max_tokens INT DEFAULT 4096 COMMENT 'Maximum tokens for this model',
  cost_multiplier DECIMAL(10, 2) DEFAULT 1.00 COMMENT 'Token cost multiplier (1.0 = normal, 2.0 = double cost)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_provider (provider),
  INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default models
INSERT INTO ai_models (display_name, provider, model_id, description, is_active, display_order, max_tokens, cost_multiplier) VALUES
('GPT 4.1 MINI', 'openai', 'gpt-3.5-turbo', 'Fast and cost-effective GPT-3.5 Turbo model', TRUE, 1, 4096, 1.0),
('GPT 5', 'openai', 'gpt-4-turbo', 'Most capable GPT-4 Turbo model with 128k context', TRUE, 2, 4096, 5.0),
('Gemini 2.5 Flash', 'google-ai', 'gemini-2.0-flash-exp', 'Google Gemini 2.0 Flash with search capability', TRUE, 3, 16000, 1.5),
('GPT 4o MINI', 'openai', 'gpt-4o-mini', 'Optimized GPT-4o Mini model', TRUE, 4, 16384, 2.0);
