-- Add keywords column to articles table
-- This column stores an array of keywords as JSON
ALTER TABLE articles 
ADD COLUMN keywords TEXT NULL 
COMMENT 'JSON array of keywords extracted from primary_keyword'
AFTER primary_keyword;

-- Example data: ["keyword1", "keyword2", "keyword3"]
