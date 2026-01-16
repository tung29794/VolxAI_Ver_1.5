-- ====================================================
-- UPDATE GENERATE_ARTICLE PROMPT WITH ENHANCED VARIABLES
-- ====================================================
-- Date: 2026-01-13
-- Purpose: Update main article generation prompt (AI viết bài theo từ khóa)
--
-- PARAGRAPH COUNT LOGIC:
-- • NO OUTLINE Mode:
--   - Short: 1 paragraph per heading
--   - Medium: 2 paragraphs per heading  
--   - Long: 3 paragraphs per heading
--
-- • YOUR OUTLINE & AI OUTLINE Mode:
--   - Always 2 paragraphs per heading (như Medium)
--
-- Available Variables:
-- - keyword: Main keyword/topic for the article
-- - language: Output language (Vietnamese, English, etc.)
-- - tone: Writing tone (professional, casual, engaging, etc.)
-- - length_instruction: Article length description
-- - outline_instruction: Outline structure to follow
-- - writing_style: Detailed writing style guidelines
-- - min_words: Minimum word count
-- - max_words: Maximum word count
-- - paragraphs_per_heading: Number of paragraphs per heading (1, 2, or 3)
-- - paragraph_words: Words per paragraph
-- - outline_mode: "no_outline" or "with_outline" (controls paragraph logic)
--
-- Output Format: HTML with proper tags
-- Table Support: Use <table> tags for tables (not Markdown)
-- ====================================================

USE jybcaorr_lisacontentdbapi;

-- Update Generate Article Prompt (Main article generation)
UPDATE ai_prompts 
SET 
  prompt_template = 'Write a comprehensive SEO-optimized article about: "{keyword}"

ARTICLE REQUIREMENTS:
- Language: {language}
- Tone: {tone}
- Length: {length_instruction}
- Target word count: {min_words} to {max_words} words

OUTLINE STRUCTURE:
{outline_instruction}

WRITING STYLE GUIDELINES:
{writing_style}

PARAGRAPH COUNT RULES - CRITICAL:
{outline_mode}

CONTENT STRUCTURE:
- Paragraph length: Each paragraph should be {paragraph_words}+ words minimum
- Include introduction (no heading) and conclusion section
- Write detailed, informative, valuable content

HTML OUTPUT FORMAT - STRICTLY REQUIRED:
Use ONLY the following HTML tags:

HEADINGS:
<h2>Main Section Title</h2>
<h3>Subsection Title</h3>

PARAGRAPHS:
<p>Regular paragraph content goes here...</p>

TEXT FORMATTING:
<strong>Bold/important text</strong>
<em>Emphasized/italic text</em>

LISTS (Unordered):
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>

LISTS (Ordered):
<ol>
  <li>First step</li>
  <li>Second step</li>
  <li>Third step</li>
</ol>

TABLES (For comparisons, pricing, features, data):
<table>
  <thead>
    <tr>
      <th>Column Header 1</th>
      <th>Column Header 2</th>
      <th>Column Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Row 1, Cell 1</td>
      <td>Row 1, Cell 2</td>
      <td>Row 1, Cell 3</td>
    </tr>
    <tr>
      <td>Row 2, Cell 1</td>
      <td>Row 2, Cell 2</td>
      <td>Row 2, Cell 3</td>
    </tr>
  </tbody>
</table>

WHEN TO USE TABLES:
Use HTML tables when presenting:
- Comparison data (Product A vs Product B)
- Pricing plans or packages
- Feature lists with multiple attributes
- Technical specifications
- Before/After comparisons
- Statistics or data sets
- Pros and Cons lists with details

TABLE FORMATTING RULES:
1. Always include <thead> with column headers in <th> tags
2. Put all data rows in <tbody>
3. Each cell must be in <td> tags
4. Keep tables simple and readable (3-5 columns max recommended)
5. Make sure data aligns properly across columns
6. Include meaningful headers that describe the data

CRITICAL FORMATTING RULES:
❌ DO NOT USE:
- Markdown headings (##, ###)
- Markdown bold (**text**)
- Markdown italic (*text*)
- Markdown lists (-, *)
- Markdown tables (| Header | Header |)
- Code fences (``` or ```html)
- Plain text formatting

✅ MUST USE:
- HTML tags only: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <table>
- Proper HTML structure throughout
- Semantic HTML tags

CONTENT WRITING GUIDELINES:

INTRODUCTION (No heading):
- Start with an engaging hook
- Introduce the topic naturally
- Preview what the article will cover
- Use keyword naturally in first paragraph
- Length: 1-2 paragraphs ({paragraph_words}+ words each)

FOR EACH HEADING (H2 or H3):
Write exactly {paragraphs_per_heading} paragraph(s) per heading
- Each paragraph must be {paragraph_words}+ words
- First paragraph: Introduce the section topic
- Additional paragraphs: Detailed explanation, examples, benefits
- Last paragraph: Summarize or transition to next point

CONCLUSION SECTION:
- H2 heading: "Kết Luận" or "Conclusion" (based on language)
- Summarize key points from the article
- Provide final thoughts or call-to-action
- End with memorable statement
- Length: 2-3 paragraphs

PARAGRAPH STRUCTURE:
Each paragraph should follow this structure:
1. Topic sentence (main idea)
2. Supporting details and explanation
3. Examples or evidence
4. Concluding or transition sentence

Make paragraphs substantial and informative, not brief or superficial.

SEO OPTIMIZATION:
- Use keyword naturally throughout (avoid keyword stuffing)
- Include related keywords and synonyms
- Write compelling, informative content
- Use descriptive headings that include relevant keywords
- Make content comprehensive and valuable
- Answer user search intent completely

QUALITY CHECKLIST BEFORE SUBMITTING:
□ Introduction has 1-2 paragraphs (no heading)
□ Each H2/H3 heading has exactly {paragraphs_per_heading} paragraph(s)
□ Each paragraph is {paragraph_words}+ words
□ Total word count is {min_words}-{max_words} words
□ Tables use <table> tags (if any tables included)
□ No Markdown syntax anywhere
□ No code fences around HTML
□ Content follows outline structure
□ Writing style matches {tone}
□ Language is {language}

Now write the complete article following ALL guidelines above:',
  
  system_prompt = 'You are an expert SEO content writer and content strategist.

CORE MISSION:
Write comprehensive, engaging, SEO-optimized articles that provide real value to readers while following precise formatting and structure requirements.

OUTPUT FORMAT REQUIREMENTS:
- Language: {language}
- Tone: {tone}
- Writing Style: {writing_style}

HTML STRUCTURE (MANDATORY):
- Use semantic HTML tags: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <table>
- NEVER use Markdown syntax (##, **, -, |, etc.)
- NEVER wrap output in code fences (```)
- Output pure HTML content only

PARAGRAPH COUNT RULES (MANDATORY):
{outline_mode}

CONTENT STRUCTURE (MANDATORY):
- Paragraphs per heading: {paragraphs_per_heading} paragraph(s)
- Paragraph length: {paragraph_words}+ words minimum
- Total length: {min_words} to {max_words} words

TABLE FORMATTING:
When presenting comparative data, use proper HTML tables:
<table>
  <thead>
    <tr><th>Header 1</th><th>Header 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Data 1</td><td>Data 2</td></tr>
  </tbody>
</table>

Use tables for:
- Product/service comparisons
- Pricing plans
- Feature lists
- Technical specifications
- Statistical data
- Pros and cons with details

WRITING QUALITY STANDARDS:
1. Comprehensive - Cover topic thoroughly
2. Engaging - Keep reader interested
3. Informative - Provide valuable insights
4. Actionable - Include practical tips
5. Well-structured - Logical flow
6. SEO-optimized - Natural keyword usage
7. Original - Unique perspective and examples
8. Detailed - Substantial paragraphs ({paragraph_words}+ words)

PARAGRAPH QUALITY:
Each paragraph must be:
- Substantial: {paragraph_words}+ words
- Focused: One main idea per paragraph
- Detailed: Include explanations and examples
- Valuable: Provide useful information
- Well-written: Clear, engaging prose

TONE GUIDELINES:
Match the specified tone ({tone}) throughout:
- Professional: Formal, authoritative, credible
- Casual: Friendly, conversational, approachable
- Engaging: Lively, interesting, captivating
- Technical: Precise, detailed, specialized
- Educational: Informative, clear, instructive

CRITICAL RULES:
□ Follow outline structure exactly
□ Use HTML tags only (no Markdown)
□ Write exactly {paragraphs_per_heading} paragraph(s) per heading
□ Make each paragraph {paragraph_words}+ words
□ Total word count: {min_words}-{max_words}
□ Use <table> tags for tables (if needed)
□ No code fences around output
□ Natural keyword integration
□ Comprehensive, valuable content

You are ready to write outstanding articles that rank well and serve readers perfectly.',
  
  available_variables = '["keyword", "language", "tone", "length_instruction", "outline_instruction", "writing_style", "min_words", "max_words", "paragraphs_per_heading", "paragraph_words", "outline_mode"]',
  
  updated_at = NOW()
  
WHERE feature_name = 'generate_article';

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================
SELECT 
  feature_name,
  available_variables,
  CASE 
    WHEN available_variables LIKE '%paragraphs_per_heading%' THEN '✅'
    ELSE '❌'
  END as has_paragraphs_per_heading,
  CASE 
    WHEN available_variables LIKE '%outline_mode%' THEN '✅'
    ELSE '❌'
  END as has_outline_mode,
  CASE 
    WHEN prompt_template LIKE '%<table>%' THEN '✅'
    ELSE '❌'
  END as has_table_support,
  CASE 
    WHEN prompt_template LIKE '%HTML OUTPUT FORMAT%' THEN '✅'
    ELSE '❌'
  END as has_html_format,
  SUBSTRING(prompt_template, 1, 200) as prompt_preview,
  updated_at
FROM ai_prompts
WHERE feature_name = 'generate_article';

-- Check all required variables
SELECT 
  'keyword' as variable,
  CASE WHEN available_variables LIKE '%keyword%' THEN '✅' ELSE '❌' END as status
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'language', CASE WHEN available_variables LIKE '%language%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'tone', CASE WHEN available_variables LIKE '%tone%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'writing_style', CASE WHEN available_variables LIKE '%writing_style%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'paragraphs_per_heading', CASE WHEN available_variables LIKE '%paragraphs_per_heading%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'paragraph_words', CASE WHEN available_variables LIKE '%paragraph_words%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'min_words', CASE WHEN available_variables LIKE '%min_words%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'max_words', CASE WHEN available_variables LIKE '%max_words%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article'
UNION ALL
SELECT 'outline_mode', CASE WHEN available_variables LIKE '%outline_mode%' THEN '✅' ELSE '❌' END
FROM ai_prompts WHERE feature_name = 'generate_article';
