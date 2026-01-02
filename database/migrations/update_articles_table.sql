-- ====================================================================
-- Update Articles Table with SEO Fields
-- ====================================================================
-- Add missing SEO and metadata columns

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE COMMENT 'URL-friendly slug',
ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255) COMMENT 'SEO title for search engines',
ADD COLUMN IF NOT EXISTS meta_description TEXT COMMENT 'Meta description for search engines',
ADD COLUMN IF NOT EXISTS keywords JSON COMMENT 'Array of keywords',
ADD COLUMN IF NOT EXISTS featured_image VARCHAR(500) COMMENT 'Featured image URL';

-- Add indexes for better query performance
ALTER TABLE articles
ADD INDEX IF NOT EXISTS idx_slug (slug),
ADD INDEX IF NOT EXISTS idx_meta_title (meta_title);
