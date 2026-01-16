-- Create article_website_mapping table
-- Allows one article to be published to multiple websites with different post types
-- Date: January 3, 2026

CREATE TABLE IF NOT EXISTS article_website_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  website_id INT NOT NULL,
  wordpress_post_id INT NOT NULL,
  post_type VARCHAR(50) DEFAULT 'post',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique constraint: one article can only have one post per website
  UNIQUE KEY unique_article_website (article_id, website_id),
  
  -- Foreign keys
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_article_id (article_id),
  INDEX idx_website_id (website_id),
  INDEX idx_wordpress_post_id (wordpress_post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data from articles table
INSERT IGNORE INTO article_website_mapping 
  (article_id, website_id, wordpress_post_id, post_type, created_at, updated_at)
SELECT 
  id as article_id,
  website_id,
  wordpress_post_id,
  COALESCE(post_type, 'post') as post_type,
  created_at,
  updated_at
FROM articles
WHERE website_id IS NOT NULL 
  AND wordpress_post_id IS NOT NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_mappings,
  COUNT(DISTINCT article_id) as unique_articles,
  COUNT(DISTINCT website_id) as unique_websites
FROM article_website_mapping;

-- Show sample data
SELECT 
  awm.id,
  awm.article_id,
  a.title as article_title,
  awm.website_id,
  w.name as website_name,
  awm.wordpress_post_id,
  awm.post_type
FROM article_website_mapping awm
LEFT JOIN articles a ON awm.article_id = a.id
LEFT JOIN websites w ON awm.website_id = w.id
ORDER BY awm.id DESC
LIMIT 10;
