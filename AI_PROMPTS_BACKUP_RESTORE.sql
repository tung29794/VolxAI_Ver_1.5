-- ================================================================
-- AI PROMPTS - BACKUP & RESTORE SCRIPT
-- Database: jybcaorr_lisacontentdbapi
-- Table: ai_prompts
-- Generated: 2026-01-08
-- ================================================================

-- ================================================================
-- BACKUP: Prompt generate_outline (ID: 21)
-- ================================================================

-- Nếu cần restore prompt này, chạy INSERT statement dưới đây

INSERT INTO ai_prompts 
(
  feature_name, 
  display_name, 
  description, 
  prompt_template, 
  system_prompt, 
  available_variables, 
  is_active
)
VALUES 
(
  'generate_outline',
  'Tạo dàn ý bài viết',
  'Tạo dàn ý chi tiết cho bài viết với cấu trúc H2/H3',
  'Create a detailed article outline about: "{keyword}"

REQUIREMENTS:
- Language: {language}
- Article length: {length_description}
- Tone/Style: {tone}
- Total H2 sections: {h2_count}
- H3 subsections per H2: {h3_per_h2}

OUTPUT FORMAT (CRITICAL):
Output ONLY the outline structure in this exact format:
[h2] Main Section Title 1
[h3] Subsection 1.1
[h3] Subsection 1.2
[h3] Subsection 1.3
[h2] Main Section Title 2
[h3] Subsection 2.1
[h3] Subsection 2.2
... continue for all {h2_count} H2 sections

RULES:
1. Use [h2] for main sections (exactly {h2_count} sections)
2. Use [h3] for subsections ({h3_per_h2} subsections per H2)
3. Make titles descriptive, SEO-friendly, and relevant to "{keyword}"
4. Each title should be a complete, meaningful phrase
5. Do NOT include introduction or conclusion explanations
6. ONLY output the outline structure, nothing else

Create the outline now:',
  'You are an expert SEO content strategist. Create well-structured article outlines with clear hierarchy. Follow the format requirements exactly.',
  '["keyword", "language", "length_description", "tone", "h2_count", "h3_per_h2"]',
  1
)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  prompt_template = VALUES(prompt_template),
  system_prompt = VALUES(system_prompt),
  available_variables = VALUES(available_variables),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- ================================================================
-- VERIFY: Check if prompt exists
-- ================================================================

SELECT 
  id,
  feature_name,
  display_name,
  is_active,
  created_at,
  updated_at
FROM ai_prompts
WHERE feature_name = 'generate_outline';

-- Expected Output:
-- +----+------------------+--------------------+-----------+---------------------+---------------------+
-- | id | feature_name     | display_name       | is_active | created_at          | updated_at          |
-- +----+------------------+--------------------+-----------+---------------------+---------------------+
-- | 21 | generate_outline | Tạo dàn ý bài viết |         1 | 2026-01-08 XX:XX:XX | 2026-01-08 XX:XX:XX |
-- +----+------------------+--------------------+-----------+---------------------+---------------------+

-- ================================================================
-- FULL BACKUP: All Active Prompts (6 prompts)
-- ================================================================

-- Tạo bảng backup tạm thời
CREATE TABLE IF NOT EXISTS ai_prompts_backup_20260108 LIKE ai_prompts;

-- Copy tất cả active prompts vào backup
INSERT INTO ai_prompts_backup_20260108
SELECT * FROM ai_prompts WHERE is_active = 1;

-- Verify backup
SELECT COUNT(*) as total_backed_up FROM ai_prompts_backup_20260108;
-- Expected: 6

-- ================================================================
-- RESTORE: Restore từ backup
-- ================================================================

-- Nếu cần restore tất cả prompts từ backup:

-- INSERT INTO ai_prompts
-- SELECT * FROM ai_prompts_backup_20260108
-- ON DUPLICATE KEY UPDATE
--   display_name = VALUES(display_name),
--   description = VALUES(description),
--   prompt_template = VALUES(prompt_template),
--   system_prompt = VALUES(system_prompt),
--   available_variables = VALUES(available_variables),
--   is_active = VALUES(is_active),
--   updated_at = CURRENT_TIMESTAMP;

-- ================================================================
-- UTILITY QUERIES
-- ================================================================

-- 1. Xem tất cả prompts
-- SELECT feature_name, display_name, is_active FROM ai_prompts ORDER BY feature_name;

-- 2. Xem chi tiết 1 prompt
-- SELECT * FROM ai_prompts WHERE feature_name = 'generate_outline' \G

-- 3. Enable prompt
-- UPDATE ai_prompts SET is_active = 1 WHERE feature_name = 'generate_outline';

-- 4. Disable prompt
-- UPDATE ai_prompts SET is_active = 0 WHERE feature_name = 'generate_outline';

-- 5. Delete prompt (không khuyến khích)
-- DELETE FROM ai_prompts WHERE feature_name = 'generate_outline';

-- 6. Export prompt sang file
-- SELECT 
--   CONCAT('INSERT INTO ai_prompts VALUES (',
--     id, ', ',
--     QUOTE(feature_name), ', ',
--     QUOTE(display_name), ', ',
--     QUOTE(description), ', ',
--     QUOTE(prompt_template), ', ',
--     QUOTE(system_prompt), ', ',
--     QUOTE(available_variables), ', ',
--     is_active, ', ',
--     QUOTE(created_at), ', ',
--     QUOTE(updated_at),
--   ');'
--   ) as insert_statement
-- FROM ai_prompts
-- WHERE feature_name = 'generate_outline';

-- ================================================================
-- TESTING: Test prompt functionality
-- ================================================================

-- 1. Check if prompt is loaded in application
-- Kiểm tra server logs khi sử dụng feature:
--   ssh jybcaorr@ghf57-22175.azdigihost.com -p 2210
--   pm2 logs volxai-api | grep "generate_outline"

-- 2. Test in Admin Dashboard
--   https://volxai.com/admin → Tab "AI Prompts"
--   Edit prompt "Tạo dàn ý bài viết"
--   Save changes
--   Test generate outline feature

-- ================================================================
-- ROLLBACK: Nếu có vấn đề
-- ================================================================

-- Nếu prompt mới gây lỗi, có thể disable nó:
-- UPDATE ai_prompts SET is_active = 0 WHERE feature_name = 'generate_outline';

-- Application sẽ tự động fallback sang hardcoded prompt

-- Sau khi fix, enable lại:
-- UPDATE ai_prompts SET is_active = 1 WHERE feature_name = 'generate_outline';

-- ================================================================
-- CLEANUP: Xóa backup table (chỉ sau khi verify OK)
-- ================================================================

-- DROP TABLE IF EXISTS ai_prompts_backup_20260108;

-- ================================================================
-- END OF BACKUP SCRIPT
-- ================================================================
