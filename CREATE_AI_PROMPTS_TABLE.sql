-- Create AI Prompts Management Table
-- This table stores customizable prompts for various AI features
-- Admin can configure prompts for each AI feature through the dashboard

CREATE TABLE IF NOT EXISTS ai_prompts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Feature identifier (unique key for each AI feature)
  feature_name VARCHAR(100) NOT NULL UNIQUE,
  
  -- Display name in admin dashboard
  display_name VARCHAR(200) NOT NULL,
  
  -- Description of what this prompt does
  description TEXT,
  
  -- The actual prompt template that will be sent to OpenAI
  -- Can contain variables like {title}, {keywords}, {content}, {language}
  prompt_template TEXT NOT NULL,
  
  -- System prompt (defines AI behavior and style)
  system_prompt TEXT NOT NULL,
  
  -- Available variables that can be used in the template
  -- JSON array: ["title", "keywords", "content", "language"]
  available_variables JSON,
  
  -- Whether this prompt is currently active
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_feature_name (feature_name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default prompts for existing AI features
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables) VALUES

-- 1. Write More Feature
(
  'write_more',
  'Viết tiếp nội dung',
  'Prompt cho tính năng "Write More" - tiếp tục viết từ đoạn văn hiện tại',
  'Here is the text that was just written:\n\n"{content}"\n\nContinue writing from this point. {language_instruction} Write naturally as if you''re continuing the same thought. Do NOT repeat or rewrite any of the text above. Only write NEW content that follows logically. Write in the same language and style as the original text. Return plain text only, no HTML tags.',
  'You are a professional content writer. Continue writing naturally from where the user left off. {language_instruction} Write ONLY the continuation without repeating any of the original text. Return plain text without HTML tags, just natural paragraphs separated by double line breaks.',
  '["content", "language_instruction"]'
),

-- 2. SEO Title Generation
(
  'seo_title',
  'Tạo tiêu đề SEO',
  'Tạo tiêu đề tối ưu SEO cho bài viết',
  'Generate an SEO-optimized title for an article about: "{title}". {language_instruction} The title should be catchy, include keywords: {keywords}, and be under 60 characters. Return only the title, nothing else.',
  'You are an SEO expert. Create compelling, keyword-rich titles that attract clicks while staying within 60 characters. {language_instruction}',
  '["title", "keywords", "language_instruction"]'
),

-- 3. Meta Description Generation
(
  'meta_description',
  'Tạo mô tả meta',
  'Tạo meta description tối ưu SEO',
  'Write a meta description for an article titled "{title}". {language_instruction} Include keywords: {keywords}. Keep it under 160 characters, make it compelling and descriptive. Return only the meta description, nothing else.',
  'You are an SEO specialist. Create persuasive meta descriptions that improve click-through rates while staying within 160 characters. {language_instruction}',
  '["title", "keywords", "language_instruction"]'
),

-- 4. AI Rewrite Feature
(
  'ai_rewrite',
  'Viết lại nội dung',
  'Viết lại nội dung theo phong cách mới',
  'Rewrite the following content in a fresh, engaging way: "{content}". {language_instruction} Keep the main ideas but use different words and sentence structures. Make it more professional and compelling. Return plain text without HTML tags.',
  'You are a professional editor and content writer. Rewrite content to be more engaging, clear, and professional while maintaining the original meaning. {language_instruction}',
  '["content", "language_instruction"]'
),

-- 5. Generate Full Article
(
  'generate_article',
  'Tạo bài viết hoàn chỉnh',
  'Tạo một bài viết hoàn chỉnh từ tiêu đề và keywords',
  'Write a detailed, well-structured article about "{title}". {language_instruction} Focus on these keywords: {keywords}. Include an introduction, main body with multiple sections, and conclusion. Make it informative and engaging. Return plain text without HTML tags.',
  'You are a professional content writer. {language_instruction} Write engaging, well-structured articles with clear sections and natural flow.',
  '["title", "keywords", "language_instruction"]'
),

-- 6. Expand Content
(
  'expand_content',
  'Mở rộng nội dung',
  'Mở rộng và làm phong phú thêm đoạn văn',
  'Expand and elaborate on this content: "{content}". {language_instruction} Add more details, examples, and insights. Make it more comprehensive while maintaining the original tone and style. Return plain text without HTML tags.',
  'You are a content development specialist. Expand on ideas by adding relevant details, examples, and depth while maintaining consistency with the original text. {language_instruction}',
  '["content", "language_instruction"]'
),

-- 7. Summarize Content
(
  'summarize',
  'Tóm tắt nội dung',
  'Tóm tắt nội dung thành đoạn ngắn gọn',
  'Summarize the following content in a concise way: "{content}". {language_instruction} Keep the key points but make it brief and clear. Return plain text without HTML tags.',
  'You are a content summarization expert. Extract and present the most important information in a clear, concise manner. {language_instruction}',
  '["content", "language_instruction"]'
);

-- Verify insertion
SELECT 
  id,
  feature_name,
  display_name,
  is_active,
  created_at
FROM ai_prompts
ORDER BY id;
