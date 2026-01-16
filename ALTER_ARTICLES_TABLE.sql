-- Add missing columns to articles table for WordPress sync feature
-- Run this on production database

USE jybcaorr_lisacontentdbapi;

-- Add wordpress_post_id column (WordPress post ID)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS wordpress_post_id INT NULL 
AFTER featured_image_alt;

-- Add website_id column (link to websites table)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS website_id INT NULL 
AFTER wordpress_post_id;

-- Add post_type column (WordPress post type: post, page, custom, etc.)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'post' 
AFTER status;

-- Rename seo_title to meta_title (for consistency with code)
ALTER TABLE articles 
CHANGE COLUMN seo_title meta_title VARCHAR(255);

-- Rename seo_description to meta_description (for consistency with code)
ALTER TABLE articles 
CHANGE COLUMN seo_description meta_description VARCHAR(500);

-- Rename seo_keywords to primary_keyword (for consistency with code)
ALTER TABLE articles 
CHANGE COLUMN seo_keywords primary_keyword VARCHAR(500);

-- Add foreign key constraint for website_id
ALTER TABLE articles 
ADD CONSTRAINT fk_articles_website 
FOREIGN KEY (website_id) REFERENCES websites(id) 
ON DELETE SET NULL;

-- Add unique constraint to prevent duplicate WordPress posts
ALTER TABLE articles 
ADD UNIQUE KEY unique_wordpress_post (website_id, wordpress_post_id);

-- Add indexes for better query performance
ALTER TABLE articles 
ADD INDEX idx_wordpress_post_id (wordpress_post_id),
ADD INDEX idx_website_id (website_id),
ADD INDEX idx_post_type (post_type);

SELECT 'Migration completed successfully!' AS status;
