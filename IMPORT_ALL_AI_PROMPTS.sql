-- ============================================
-- AI PROMPTS - Import tất cả prompts mẫu
-- ============================================
-- File này tạo prompts cho các chức năng AI sử dụng OpenAI
-- Chạy script này để có đầy đủ 5 prompts trong database

-- NOTE: expand_content có thể đã tồn tại, script sẽ skip nếu trùng feature_name
-- NOTE: find_image KHÔNG có trong list vì nó dùng Google API, không cần AI prompts

-- ============================================
-- 1. Write More / Expand Content
-- ============================================
INSERT INTO ai_prompts (
  feature_name, 
  display_name, 
  description, 
  prompt_template, 
  system_prompt, 
  available_variables, 
  is_active,
  created_at,
  updated_at
)
SELECT 
  'expand_content',
  'Mở rộng nội dung',
  'Mở rộng và làm phong phú thêm đoạn văn',
  'Expand and elaborate on this content: "{content}". {language_instruction} Add more details, examples, and explanations to make it more comprehensive and engaging.',
  'You are a content development specialist. Expand on ideas by adding relevant details, examples, and explanations. {language_instruction} Write naturally and engagingly.',
  '["content", "language_instruction"]',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ai_prompts WHERE feature_name = 'expand_content'
);

-- ============================================
-- 2. Rewrite Content
-- ============================================
INSERT INTO ai_prompts (
  feature_name, 
  display_name, 
  description, 
  prompt_template, 
  system_prompt, 
  available_variables, 
  is_active,
  created_at,
  updated_at
)
SELECT 
  'rewrite_content',
  'Viết lại nội dung',
  'Viết lại văn bản theo nhiều phong cách khác nhau',
  'Rewrite the following text in {style} style:\n\n"{text}"\n\n{language_instruction}\n\nAvailable styles: standard, shorter, longer, easy, creative, funny, casual, friendly, professional',
  'You are a professional content rewriter. Rewrite text according to the specified style while maintaining accuracy and clarity. {language_instruction} Adapt your tone and approach based on the requested style.',
  '["text", "style", "language_instruction"]',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ai_prompts WHERE feature_name = 'rewrite_content'
);

-- ============================================
-- 3. Generate Article
-- ============================================
INSERT INTO ai_prompts (
  feature_name, 
  display_name, 
  description, 
  prompt_template, 
  system_prompt, 
  available_variables, 
  is_active,
  created_at,
  updated_at
)
SELECT 
  'generate_article',
  'Tạo bài viết hoàn chỉnh',
  'Tạo một bài viết hoàn chỉnh từ từ khóa',
  'Write a comprehensive article about: "{keyword}". {language_instruction}

The article should:
- Be at least 800 words
- Have a clear structure with introduction, body, and conclusion
- Include relevant examples and details
- Be engaging and informative
- Be SEO-optimized
- Use natural language and proper formatting',
  'You are a professional content writer. {language_instruction} Write engaging, well-structured articles with proper formatting. Focus on providing value to readers while optimizing for search engines.',
  '["keyword", "language_instruction"]',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ai_prompts WHERE feature_name = 'generate_article'
);

-- ============================================
-- 4. Generate SEO Title
-- ============================================
INSERT INTO ai_prompts (
  feature_name, 
  display_name, 
  description, 
  prompt_template, 
  system_prompt, 
  available_variables, 
  is_active,
  created_at,
  updated_at
)
SELECT 
  'generate_seo_title',
  'Tạo tiêu đề SEO',
  'Tạo tiêu đề tối ưu SEO từ từ khóa',
  'Create an SEO-optimized title for the keyword: "{keyword}". {language_instruction}

The title should be:
- Between 50-60 characters
- Include the keyword naturally
- Be compelling and click-worthy
- Match search intent
- Use power words when appropriate

Return ONLY the title, without quotes or extra text.',
  'You are an SEO expert specializing in creating compelling, click-worthy titles. {language_instruction} Create titles that rank well and attract clicks.',
  '["keyword", "language_instruction"]',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ai_prompts WHERE feature_name = 'generate_seo_title'
);

-- ============================================
-- 5. Generate Meta Description
-- ============================================
INSERT INTO ai_prompts (
  feature_name, 
  display_name, 
  description, 
  prompt_template, 
  system_prompt, 
  available_variables, 
  is_active,
  created_at,
  updated_at
)
SELECT 
  'generate_meta_description',
  'Tạo Meta Description',
  'Tạo meta description tối ưu SEO',
  'Create an SEO-optimized meta description for the keyword: "{keyword}". {language_instruction}

The meta description should be:
- Between 150-160 characters
- Engaging and informative
- Include the keyword naturally
- Encourage clicks with a call-to-action
- Accurately describe the content

Return ONLY the meta description, without quotes or extra text.',
  'You are an SEO expert specializing in meta descriptions. {language_instruction} Create descriptions that improve click-through rates and accurately represent the content.',
  '["keyword", "language_instruction"]',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ai_prompts WHERE feature_name = 'generate_meta_description'
);

-- ============================================
-- Verify inserted prompts
-- ============================================
SELECT 
  id,
  feature_name,
  display_name,
  is_active,
  created_at
FROM ai_prompts
ORDER BY created_at DESC;

-- ============================================
-- Summary
-- ============================================
-- Script này tạo 5 prompts cho các chức năng sử dụng OpenAI:
-- 1. expand_content - Mở rộng nội dung
-- 2. rewrite_content - Viết lại nội dung  
-- 3. generate_article - Tạo bài viết hoàn chỉnh
-- 4. generate_seo_title - Tạo tiêu đề SEO
-- 5. generate_meta_description - Tạo Meta Description
--
-- KHÔNG bao gồm find_image vì nó dùng Google API
-- Tất cả prompts được set is_active = TRUE
-- Script sử dụng WHERE NOT EXISTS để tránh duplicate
-- ============================================
