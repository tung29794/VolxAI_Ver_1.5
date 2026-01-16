-- ========================================
-- ADD USER MANAGEMENT FIELDS
-- Date: 2026-01-15
-- Description: Add columns for admin user management
-- ========================================

-- 1. Add role column to users table (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user' 
AFTER password;

-- 2. Add tokens_remaining column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tokens_remaining INT DEFAULT 0 
AFTER role;

-- 3. Add article_limit column (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS article_limit INT DEFAULT 2 
AFTER tokens_remaining;

-- 4. Add admin_notes column for admin to take notes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS admin_notes TEXT 
AFTER bio;

-- 5. Add last_login column to track user activity
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL 
AFTER updated_at;

-- 6. Add locked status (different from is_active)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE 
AFTER is_active;

-- 7. Add locked reason
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS locked_reason VARCHAR(500) 
AFTER is_locked;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_is_locked ON users(is_locked);
CREATE INDEX IF NOT EXISTS idx_last_login ON users(last_login);

-- 9. Update existing users to have tokens_remaining from their subscription
UPDATE users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_active = 1
SET 
  u.tokens_remaining = COALESCE(us.tokens_limit, 10000),
  u.article_limit = COALESCE(us.articles_limit, 2)
WHERE u.tokens_remaining IS NULL OR u.tokens_remaining = 0;

-- 10. Add subscription_notes to user_subscriptions for tracking
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS notes TEXT 
AFTER auto_renew;

-- 11. Add subscription plan_name for display
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100) 
AFTER plan_type;

-- Update plan names based on type
UPDATE user_subscriptions 
SET plan_name = CASE 
  WHEN plan_type = 'free' THEN 'Gói Miễn Phí'
  WHEN plan_type = 'starter' THEN 'Gói Starter'
  WHEN plan_type = 'grow' THEN 'Gói Grow'
  WHEN plan_type = 'professional' THEN 'Gói Professional'
  ELSE 'Không xác định'
END
WHERE plan_name IS NULL;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check users table structure
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'users' 
  AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;

-- Check user_subscriptions structure
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user_subscriptions' 
  AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;

-- Sample data check
SELECT 
  u.id,
  u.email,
  u.username,
  u.role,
  u.tokens_remaining,
  u.article_limit,
  u.is_active,
  u.is_locked,
  u.created_at,
  us.plan_type,
  us.plan_name,
  us.expires_at,
  (SELECT COUNT(*) FROM articles WHERE user_id = u.id) as total_articles
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LIMIT 10;
