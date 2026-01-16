-- ====================================================
-- ADD KNOWLEDGE COLUMN TO WEBSITES TABLE
-- ====================================================
-- Date: 2026-01-14
-- Purpose: Add knowledge column to store website-specific knowledge and context
--
-- This column will store:
-- - Website description and niche
-- - Target audience information
-- - Writing style preferences
-- - Common terminology
-- - Content guidelines
-- - Things to avoid
--
-- AI will use this information to generate relevant content for each website
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- Add knowledge column to websites table
ALTER TABLE websites
ADD COLUMN knowledge TEXT NULL AFTER api_token
COMMENT 'Website knowledge and context for AI content generation';

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
-- Check if column was added successfully
DESCRIBE websites;

-- Check existing websites (should show NULL for knowledge)
SELECT 
  id,
  name,
  url,
  CASE 
    WHEN knowledge IS NULL THEN 'NULL (not set)'
    WHEN knowledge = '' THEN 'Empty string'
    ELSE CONCAT(LEFT(knowledge, 50), '...')
  END as knowledge_preview,
  created_at
FROM websites
ORDER BY id;

-- ====================================================
-- EXAMPLE USAGE
-- ====================================================
-- Update knowledge for a specific website:
/*
UPDATE websites 
SET knowledge = 'Website: Chuyên về ẩm thực Việt Nam
Lĩnh vực: Chia sẻ công thức nấu ăn, đánh giá nhà hàng, văn hóa ẩm thực
Đối tượng: Người yêu thích nấu ăn, thích khám phá món ngon
Phong cách: Thân thiện, gần gũi, đời thường

Đặc điểm nội dung:
- Luôn có phần nguyên liệu chi tiết
- Hướng dẫn từng bước cụ thể
- Có mẹo nấu ăn hay
- Thêm câu chuyện về món ăn
- Dùng nhiều từ ngữ địa phương

Điều cần tránh:
- Không dùng từ ngữ quá học thuật
- Không viết theo kiểu sách giáo khoa
- Tránh câu văn quá dài, khó hiểu'
WHERE id = 1;
*/

-- ====================================================
-- ROLLBACK (if needed)
-- ====================================================
-- To remove the knowledge column:
-- ALTER TABLE websites DROP COLUMN knowledge;

-- ====================================================
-- END OF SCRIPT
-- ====================================================
