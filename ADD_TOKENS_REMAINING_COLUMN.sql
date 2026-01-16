-- Migration: Add tokens_remaining column to users table
-- Date: 2026-01-04
-- Purpose: Support token tracking system for AI features

-- Step 1: Add tokens_remaining column to users table
ALTER TABLE users 
ADD COLUMN tokens_remaining INT DEFAULT NULL 
AFTER role;

-- Step 2: Initialize tokens_remaining from user_subscriptions.tokens_limit
-- This ensures all active users have their tokens initialized
UPDATE users u 
JOIN user_subscriptions us ON u.id = us.user_id 
SET u.tokens_remaining = us.tokens_limit 
WHERE us.is_active = 1 
  AND (u.tokens_remaining IS NULL OR u.tokens_remaining = 0);

-- Step 3: Verify the migration
SELECT 
    u.id,
    u.email,
    u.tokens_remaining,
    us.tokens_limit,
    us.plan_type
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_active = 1
ORDER BY u.id
LIMIT 10;

-- Notes:
-- - tokens_remaining: Actual remaining tokens after usage (deducted after each AI operation)
-- - tokens_limit: Maximum tokens per plan (from user_subscriptions)
-- - When tokens_remaining is NULL, backend will auto-initialize from tokens_limit
-- - Token usage is logged in token_usage_history table
