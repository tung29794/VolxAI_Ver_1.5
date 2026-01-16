-- Update toplist prompts to include writing_style variable
-- This ensures the writing style (from length config) is properly applied

-- 1. Update generate_toplist_article prompt
UPDATE ai_prompts 
SET 
  prompt_template = 'Write a comprehensive toplist article about: "{keyword}"

ARTICLE REQUIREMENTS:
- Language: {language}
- Tone/Style: {tone}
- Length: {length_instruction}
- Structure: Follow the provided outline exactly

⚠️ WRITING STYLE REQUIREMENTS:
{writing_style}

{outline_instruction}

CRITICAL WRITING RULES:
- Start with an engaging introduction paragraph (NO heading)
- Use numbered H2 headings for each main item (1. , 2. , 3. ...)
- Write {paragraphs_per_item} detailed paragraphs for EACH numbered item
- Each paragraph should be {paragraph_words}+ words with comprehensive detail
- Include H3 subsections where appropriate for depth
- End with a strong conclusion section
- Explain every point thoroughly with examples, analysis, and practical information
- DO NOT write briefly - expand on every topic with valuable detail
- FOLLOW THE WRITING STYLE ABOVE - adjust depth and detail accordingly

Make sure the article reaches the minimum word count of {min_words} words by providing thorough explanations and examples for each item.

Write the complete article now:',
  
  system_prompt = 'You are a professional SEO content writer specializing in toplist articles (Top 10, 5 Ways, etc.).
Write in {language} language.
Tone: {tone}
{length_instruction}

⚠️ WRITING STYLE:
{writing_style}

TOPLIST ARTICLE STRUCTURE:
- Opening paragraph (no heading) - introduce the topic  
- Numbered items (1, 2, 3...) with H2 headings
- Each item should have {paragraphs_per_item} detailed paragraphs
- Conclusion paragraph
- Use proper formatting with headings (<h2>, <h3>) and paragraphs (<p>)
- FOLLOW THE WRITING STYLE REQUIREMENT ABOVE',
  
  available_variables = '["keyword", "language", "tone", "length_instruction", "writing_style", "outline_instruction", "paragraphs_per_item", "paragraph_words", "min_words"]',
  updated_at = NOW()
WHERE feature_name = 'generate_toplist_article';

-- 2. Update fallback prompts in code to also include writing_style
-- (This will be done in the code update)

-- Verify the update
SELECT 
  id,
  feature_name,
  display_name,
  LEFT(prompt_template, 200) as prompt_preview,
  available_variables,
  is_active,
  updated_at
FROM ai_prompts
WHERE feature_name = 'generate_toplist_article';
