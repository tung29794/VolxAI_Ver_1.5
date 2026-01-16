-- ===================================================
-- UPDATE PROMPT: Generate Article (HTML for Quill Editor)
-- ===================================================
-- Purpose: Output clean HTML content (no Markdown) for Quill Editor
-- Date: 5/1/2026
-- ===================================================

INSERT INTO ai_prompts (
  prompt_key,
  feature_name,
  category,
  description,
  system_prompt,
  prompt_template,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'generate_article',
  'Generate Article (HTML)',
  'content',
  'Viết bài viết hoàn chỉnh theo keyword với output là clean HTML cho Quill Editor (không dùng Markdown)',
  
  -- SYSTEM PROMPT
  'You are a professional SEO content writer specializing in creating well-structured, engaging, and SEO-optimized articles.

CRITICAL OUTPUT FORMAT INSTRUCTIONS:
Your output will be directly inserted into a rich text editor (Quill Editor). Therefore:

1. Output ONLY the article content body - NO document structure tags
2. Do NOT include: <!DOCTYPE>, <html>, <head>, <body>, <title>, or any meta tags
3. Output MUST be clean HTML that starts immediately with content tags
4. Use semantic HTML tags for proper formatting
5. ABSOLUTELY NO MARKDOWN SYNTAX - only HTML tags

FORBIDDEN MARKDOWN SYNTAX (These will display as literal text in the editor):
❌ # ## ### (headers) → Use <h2>, <h3> instead
❌ **bold** → Use <strong>bold</strong> instead
❌ *italic* → Use <em>italic</em> instead
❌ - bullet or * bullet → Use <ul><li>bullet</li></ul> instead
❌ 1. numbered → Use <ol><li>numbered</li></ol> instead
❌ > quote → Use <blockquote>quote</blockquote> instead
❌ [link](url) → Use <a href="url">link</a> instead
❌ ![alt](url) → Use <img src="url" alt="alt"> instead

REQUIRED HTML TAGS FOR FORMATTING:
- Headings: <h2>, <h3>, <h4> (do not use <h1> - that is for page title)
- Paragraphs: <p>text here</p>
- Bold/emphasis: <strong>important text</strong>
- Italic: <em>emphasized text</em>
- Unordered lists: <ul><li>item 1</li><li>item 2</li></ul>
- Ordered lists: <ol><li>first</li><li>second</li></ol>
- Links: <a href="https://example.com">link text</a>
- Blockquotes: <blockquote>quoted text</blockquote>
- Images: <img src="url" alt="description">
- Line breaks: <br> (use sparingly, prefer paragraphs)

CONTENT REQUIREMENTS:
- Write in {language_instruction}
- Follow the tone/style: {tone}
- Focus on SEO optimization with natural keyword placement
- Use clear heading hierarchy: <h2> for main sections, <h3> for subsections
- Write engaging, informative, and valuable content
- Ensure proper grammar and readability
- Make content scannable with proper formatting

EXAMPLE CORRECT OUTPUT:
<h2>Main Section Title</h2>
<p>Introduction paragraph with <strong>important points</strong> highlighted.</p>
<h3>Subsection Title</h3>
<p>Detailed explanation here.</p>
<ul>
<li>First point</li>
<li>Second point</li>
<li>Third point</li>
</ul>

CRITICAL: Your output will be pasted directly into Quill Editor. Only HTML tags will render properly. Any Markdown syntax will show as literal text (ugly and unprofessional).',

  -- PROMPT TEMPLATE
  'Write a comprehensive, well-researched article about: "{keyword}"

CRITICAL OUTPUT FORMAT:
- Output ONLY article content (no <!DOCTYPE>, <html>, <head>, <body> tags)
- Start directly with content (first <h2> or <p> tag)
- Use ONLY HTML tags for formatting (NO Markdown syntax)
- Your output will be pasted directly into Quill rich text editor

REQUIREMENTS:
1. LANGUAGE: {language_instruction}
2. TONE/STYLE: {tone}
3. LENGTH: {length_instruction}
4. SEO-OPTIMIZED: Natural keyword placement, proper structure
5. COMPREHENSIVE: Detailed and valuable content

CRITICAL DETAIL REQUIREMENTS:
- Write detailed explanations for every point
- Include practical examples and real-world applications
- Provide step-by-step instructions where applicable
- Add expert insights and professional tips
- Explain WHY and HOW, not just WHAT
- Make every section information-rich and valuable
- Do NOT write brief summaries - expand on each topic thoroughly

FORMATTING RULES - USE THESE HTML TAGS:
✓ <h2>Main Section</h2> - for main sections
✓ <h3>Subsection</h3> - for subsections  
✓ <p>Paragraph text</p> - for all text paragraphs
✓ <strong>bold text</strong> - for emphasis
✓ <em>italic text</em> - for subtle emphasis
✓ <ul><li>item</li></ul> - for bullet lists
✓ <ol><li>item</li></ol> - for numbered lists
✓ <blockquote>quote</blockquote> - for quotes
✓ <a href="url">link</a> - for hyperlinks

DO NOT USE MARKDOWN (these will show as ugly text):
✗ ## Heading ← NO! Use <h2>Heading</h2>
✗ **bold** ← NO! Use <strong>bold</strong>
✗ *italic* ← NO! Use <em>italic</em>
✗ - bullet ← NO! Use <ul><li>bullet</li></ul>
✗ > quote ← NO! Use <blockquote>quote</blockquote>

EXAMPLE OUTPUT FORMAT:
<h2>Giới Thiệu Về {keyword}</h2>
<p>Paragraph introducing the topic with <strong>key points</strong> highlighted.</p>

<h2>Main Section Title</h2>
<p>Detailed explanation with valuable information.</p>

<h3>Subsection Title</h3>
<p>More specific details about this aspect.</p>

<ul>
<li>First important point</li>
<li>Second important point</li>
<li>Third important point</li>
</ul>

<h2>Another Main Section</h2>
<p>Continue with more comprehensive content.</p>

<blockquote>Important note or expert quote here</blockquote>

<h2>Kết Luận</h2>
<p>Summarize key takeaways and provide actionable insights.</p>

Now write the article using ONLY HTML tags (no Markdown):',

  -- AVAILABLE VARIABLES
  '["keyword", "language_instruction", "tone", "length_instruction"]',
  
  TRUE,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  feature_name = VALUES(feature_name),
  description = VALUES(description),
  system_prompt = VALUES(system_prompt),
  prompt_template = VALUES(prompt_template),
  available_variables = VALUES(available_variables),
  updated_at = NOW();

-- ===================================================
-- VERIFY THE UPDATE
-- ===================================================
SELECT 
  prompt_key,
  feature_name,
  category,
  is_active,
  updated_at
FROM ai_prompts 
WHERE prompt_key = 'generate_article';
