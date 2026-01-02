-- ========================================
-- Add rejection_reason support to subscription_history
-- ========================================

-- 1. Add rejection_reason column to subscription_history (if not exists)
-- Note: Using conditional approach for safety
SET @dbname = DATABASE();
SET @tablename = "subscription_history";
SET @columnname = "rejection_reason";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE 
    (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TEXT AFTER notes")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Modify status ENUM to include 'rejected'
ALTER TABLE subscription_history
MODIFY COLUMN status ENUM('pending', 'pending_approval', 'completed', 'cancelled', 'failed', 'rejected') DEFAULT 'pending';

-- ========================================
-- Verification (run these to check)
-- ========================================
-- DESCRIBE subscription_history;
-- SHOW COLUMNS FROM subscription_history WHERE Field = 'status';
