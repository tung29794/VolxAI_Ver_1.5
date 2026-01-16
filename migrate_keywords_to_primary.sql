-- Migration: Copy keywords to primary_keyword column
-- Date: January 3, 2026
-- Purpose: Populate primary_keyword from keywords JSON array

-- Step 1: Add primary_keyword column if not exists
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS primary_keyword VARCHAR(255) NULL
AFTER meta_description;

-- Step 2: Update primary_keyword from keywords JSON array
-- Extract first keyword from JSON array
UPDATE articles 
SET primary_keyword = JSON_UNQUOTE(JSON_EXTRACT(keywords, '$[0]'))
WHERE keywords IS NOT NULL 
  AND JSON_TYPE(keywords) = 'ARRAY'
  AND JSON_LENGTH(keywords) > 0
  AND (primary_keyword IS NULL OR primary_keyword = '');

-- Step 3: Verify migration
SELECT 
  id,
  title,
  keywords,
  primary_keyword,
  CASE 
    WHEN primary_keyword IS NOT NULL AND primary_keyword != '' THEN '✓ Migrated'
    WHEN keywords IS NOT NULL THEN '⚠ Has keywords but no primary'
    ELSE '○ No keywords'
  END as status
FROM articles
ORDER BY id DESC
LIMIT 20;

-- Summary
SELECT 
  COUNT(*) as total_articles,
  SUM(CASE WHEN primary_keyword IS NOT NULL AND primary_keyword != '' THEN 1 ELSE 0 END) as with_primary_keyword,
  SUM(CASE WHEN keywords IS NOT NULL AND JSON_LENGTH(keywords) > 0 THEN 1 ELSE 0 END) as with_keywords
FROM articles;
