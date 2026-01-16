-- ====================================================
-- UPDATE CONTINUE_ARTICLE PROMPT WITH ENHANCED VARIABLES
-- ====================================================
-- Date: 2026-01-13
-- Purpose: Update article continuation prompt with comprehensive variables
--
-- Available Variables:
-- - continuation_instruction: What to continue writing
-- - continuation_rules: Rules for continuation
-- - outline_reference: Reference outline structure
-- - writing_style: How to write (detailed/concise/engaging)
-- - min_words: Minimum word count
-- - max_words: Maximum word count
-- - h2_paragraphs: Paragraphs per H2 section
-- - h3_paragraphs: Paragraphs per H3 section
-- - paragraph_words: Words per paragraph
--
-- Output Format: HTML with proper tags
-- Table Support: Use <table> tags for tables
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- Update Continue Article Prompt
UPDATE ai_prompts 
SET 
  prompt_template = 'Continue writing the article from where it was cut off.

{continuation_instruction}

CONTINUATION REQUIREMENTS:
{continuation_rules}

OUTLINE REFERENCE:
{outline_reference}

WRITING STYLE:
{writing_style}

LENGTH REQUIREMENTS:
- Minimum words: {min_words}
- Maximum words: {max_words}
- Paragraphs per H2 section: {h2_paragraphs}
- Paragraphs per H3 section: {h3_paragraphs}
- Words per paragraph: {paragraph_words}+

HTML OUTPUT FORMAT:
- Use proper HTML tags: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>
- Headings: <h2>Main Section</h2>, <h3>Subsection</h3>
- Paragraphs: <p>Content here...</p>
- Bold text: <strong>important text</strong>
- Italic text: <em>emphasized text</em>
- Lists: <ul><li>Item 1</li><li>Item 2</li></ul>
- Ordered lists: <ol><li>First</li><li>Second</li></ol>
- Tables: <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>

TABLE FORMAT (If needed):
When including tables, use proper HTML table structure:

<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Column 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Row 1 Data 1</td>
      <td>Row 1 Data 2</td>
      <td>Row 1 Data 3</td>
    </tr>
    <tr>
      <td>Row 2 Data 1</td>
      <td>Row 2 Data 2</td>
      <td>Row 2 Data 3</td>
    </tr>
  </tbody>
</table>

CRITICAL RULES:
1. Continue EXACTLY from where the previous content ended
2. Do NOT repeat any content that was already written
3. Follow the outline structure precisely
4. Use HTML tags only, NO Markdown syntax
5. If you need a table, use <table> tags, NOT Markdown table syntax
6. Each <h2> section should have {h2_paragraphs} paragraphs
7. Each <h3> subsection should have {h3_paragraphs} paragraphs
8. Each paragraph should be {paragraph_words}+ words
9. Do NOT use code fences (```) around HTML
10. Write naturally and engage the reader

PARAGRAPH STRUCTURE:
- Introduction/transition sentence
- Main content with details and examples
- Supporting information and explanation
- Conclusion or transition to next point

OUTPUT FORMAT CHECKLIST:
✓ All headings wrapped in <h2> or <h3> tags
✓ All paragraphs wrapped in <p> tags
✓ Tables use <table>, <thead>, <tbody>, <tr>, <th>, <td> tags
✓ No Markdown syntax (no ##, **, -, |, etc.)
✓ No code fences (no ```)
✓ Proper HTML structure

Continue writing now:',
  
  system_prompt = 'You are a professional SEO content writer continuing an article that was cut off.

CORE RESPONSIBILITIES:
1. Continue seamlessly from where the previous content ended
2. Follow the article outline precisely
3. Maintain consistent tone and style
4. Write in proper HTML format
5. Create engaging, informative content

HTML OUTPUT REQUIREMENTS:
- Use semantic HTML tags: <h2>, <h3>, <p>, <strong>, <em>
- Structure lists with <ul>/<ol> and <li> tags
- Format tables with <table>, <thead>, <tbody>, <tr>, <th>, <td> tags
- NO Markdown syntax allowed
- NO code fences around HTML

WRITING STYLE:
{writing_style}

PARAGRAPH GUIDELINES:
- H2 sections: {h2_paragraphs} paragraphs each
- H3 sections: {h3_paragraphs} paragraphs each
- Each paragraph: {paragraph_words}+ words
- Write detailed, comprehensive content
- Include examples and explanations
- Maintain reader engagement

TABLE FORMATTING:
When including comparative data, pricing, features, or structured information:
- Use proper HTML <table> structure
- Include <thead> with <th> column headers
- Use <tbody> for data rows
- Each cell in <td> tags
- Make tables informative and well-organized

CRITICAL: 
- Do NOT repeat content already written
- Continue EXACTLY where it was cut off
- Follow the outline structure
- Output HTML only, no Markdown',
  
  available_variables = '["continuation_instruction", "continuation_rules", "outline_reference", "writing_style", "min_words", "max_words", "h2_paragraphs", "h3_paragraphs", "paragraph_words"]',
  
  updated_at = NOW()
  
WHERE feature_name = 'continue_article';

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
SELECT 
  feature_name,
  available_variables,
  CASE 
    WHEN available_variables LIKE '%continuation_instruction%' THEN '✅'
    ELSE '❌'
  END as has_continuation_instruction,
  CASE 
    WHEN available_variables LIKE '%h2_paragraphs%' THEN '✅'
    ELSE '❌'
  END as has_h2_paragraphs,
  CASE 
    WHEN prompt_template LIKE '%<table>%' THEN '✅'
    ELSE '❌'
  END as has_table_format,
  CASE 
    WHEN prompt_template LIKE '%HTML OUTPUT FORMAT%' THEN '✅'
    ELSE '❌'
  END as has_html_format,
  SUBSTRING(prompt_template, 1, 200) as prompt_preview,
  updated_at
FROM ai_prompts
WHERE feature_name = 'continue_article';

-- Check variable coverage
SELECT 
  'continuation_instruction' as variable,
  CASE WHEN available_variables LIKE '%continuation_instruction%' THEN '✅' ELSE '❌' END as status
FROM ai_prompts WHERE feature_name = 'continue_article'
UNION ALL
SELECT 'continuation_rules', CASE WHEN available_variables LIKE '%continuation_rules%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'continue_article'
UNION ALL
SELECT 'outline_reference', CASE WHEN available_variables LIKE '%outline_reference%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'continue_article'
UNION ALL
SELECT 'writing_style', CASE WHEN available_variables LIKE '%writing_style%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'continue_article'
UNION ALL
SELECT 'h2_paragraphs', CASE WHEN available_variables LIKE '%h2_paragraphs%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'continue_article'
UNION ALL
SELECT 'h3_paragraphs', CASE WHEN available_variables LIKE '%h3_paragraphs%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'continue_article'
UNION ALL
SELECT 'paragraph_words', CASE WHEN available_variables LIKE '%paragraph_words%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'continue_article';

-- ====================================================
-- END OF SCRIPT
-- ====================================================

-- ====================================================
-- USAGE EXAMPLE IN CODE
-- ====================================================
/*
const continuationPrompt = interpolatePrompt(continuePromptTemplate.prompt_template, {
  continuation_instruction: "Continue writing from H2: 'Benefits of SEO'",
  continuation_rules: "Complete all remaining H2 and H3 sections from outline",
  outline_reference: outlineText,
  writing_style: "Detailed, informative, engaging. Use examples and explanations.",
  min_words: "2000",
  max_words: "3000",
  h2_paragraphs: "3",
  h3_paragraphs: "2",
  paragraph_words: "80"
});
*/
