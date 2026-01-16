-- Quick fix: Add knowledge column to websites table
-- Run this in your database (phpMyAdmin or MySQL client)

-- Step 1: Add the knowledge column
ALTER TABLE `websites` ADD `knowledge` TEXT NULL AFTER `api_token`;

-- Step 2: Verify the column was added (optional)
SHOW COLUMNS FROM `websites`;
