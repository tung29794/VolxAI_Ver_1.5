-- Fix 1: Add tokens_remaining column to users table
-- This column was missing from previous deployment

ALTER TABLE users 
ADD COLUMN tokens_remaining INT DEFAULT NULL 
AFTER email;

-- Initialize tokens_remaining from tokens_limit for existing users
UPDATE users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_active = 1
SET u.tokens_remaining = COALESCE(us.tokens_limit, 0)
WHERE u.tokens_remaining IS NULL;

-- Verify
SELECT 
  id, 
  username, 
  tokens_remaining,
  (SELECT tokens_limit FROM user_subscriptions WHERE user_id = users.id AND is_active = 1 LIMIT 1) as tokens_limit
FROM users 
LIMIT 10;
