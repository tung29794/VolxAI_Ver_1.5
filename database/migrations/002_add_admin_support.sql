-- ========================================
-- Add Admin Support to VolxAI Database
-- ========================================

-- 1. Add role column to users table for admin support
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user' AFTER is_verified;

-- 2. Create payment_approvals table for pending payment reviews
CREATE TABLE IF NOT EXISTS payment_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT NOT NULL,
  from_plan VARCHAR(50),
  to_plan VARCHAR(50) NOT NULL,
  amount INT NOT NULL,
  billing_period ENUM('monthly', 'annual') DEFAULT 'monthly',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Update subscription_history table status if it exists
-- This is safe and will only run if the table exists
ALTER TABLE subscription_history
MODIFY IF EXISTS status ENUM('pending', 'pending_approval', 'completed', 'cancelled', 'failed') DEFAULT 'pending';

-- If subscription_history doesn't exist yet, create it
CREATE TABLE IF NOT EXISTS subscription_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_plan ENUM('free', 'starter', 'grow', 'professional') DEFAULT 'free',
  to_plan ENUM('free', 'starter', 'grow', 'professional') NOT NULL,
  amount INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'VND',
  billing_cycle ENUM('monthly', 'annual') DEFAULT 'monthly',
  status ENUM('pending', 'pending_approval', 'completed', 'cancelled', 'failed') DEFAULT 'completed',
  transaction_id VARCHAR(100),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add expires_at column to user_subscriptions if not exists
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL AFTER is_active;

-- Add index for expiration date for efficient auto-downgrade queries
ALTER TABLE user_subscriptions
ADD INDEX IF NOT EXISTS idx_expires_at (expires_at);

-- ========================================
-- Verify tables created
-- ========================================
-- SELECT 'payment_approvals' as table_name, COUNT(*) as rows FROM payment_approvals
-- UNION
-- SELECT 'subscription_history', COUNT(*) FROM subscription_history;
