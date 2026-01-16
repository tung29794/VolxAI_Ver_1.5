-- ========================================
-- CREATE BATCH JOBS TABLE
-- Date: 2026-01-15
-- Description: Table for tracking batch article generation jobs
-- ========================================

CREATE TABLE IF NOT EXISTS batch_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_type VARCHAR(50) NOT NULL DEFAULT 'batch_keywords', -- 'batch_keywords', 'batch_source', etc.
  status ENUM('pending', 'processing', 'completed', 'failed', 'paused', 'cancelled') DEFAULT 'pending',
  
  -- Job configuration
  total_items INT NOT NULL DEFAULT 0,           -- Total number of articles to create
  completed_items INT NOT NULL DEFAULT 0,       -- Number of articles completed
  failed_items INT NOT NULL DEFAULT 0,          -- Number of articles failed
  
  -- Job data (JSON)
  job_data JSON,                                -- Store keywords array and settings
  -- Example: {
  --   "keywords": [
  --     ["máy tính", "laptop"],
  --     ["điện thoại", "iphone"]
  --   ],
  --   "settings": {
  --     "model": "gpt-4o-mini",
  --     "language": "vietnamese",
  --     "tone": "professional",
  --     "wordCount": "medium",
  --     "outlineOption": "ai-outline",
  --     "autoInsertImages": true,
  --     "maxImages": 5
  --   }
  -- }
  
  -- Progress tracking
  current_item_index INT DEFAULT 0,             -- Current item being processed
  article_ids JSON,                             -- Array of created article IDs
  -- Example: [123, 124, 125, ...]
  
  -- Error tracking
  error_message TEXT,                           -- Last error message
  error_details JSON,                           -- Detailed error info
  
  -- Limits tracking at job start
  tokens_at_start INT,                          -- User tokens when job started
  tokens_used INT DEFAULT 0,                    -- Total tokens used by this job
  articles_limit_at_start INT,                  -- Article limit when started
  
  -- Timestamps
  started_at TIMESTAMP NULL,                    -- When processing actually started
  completed_at TIMESTAMP NULL,                  -- When job completed/failed
  last_activity_at TIMESTAMP NULL,              -- Last time job was updated
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- VERIFICATION
-- ========================================

-- Check table structure
DESCRIBE batch_jobs;

-- Sample query to get user's batch jobs
SELECT 
  id,
  job_type,
  status,
  total_items,
  completed_items,
  failed_items,
  CONCAT(completed_items, '/', total_items) as progress,
  created_at,
  started_at,
  completed_at
FROM batch_jobs
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;
