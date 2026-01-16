-- ============================================================================
-- ADD NEWS PROMPTS TO AI_PROMPTS TABLE
-- ============================================================================
-- Purpose: Add 4 prompts for Write News feature to enable database-driven
--          prompt management (matching other features like Generate Article)
-- Date: January 14, 2026
-- Feature: Write News (News API Integration)
-- ============================================================================

-- Insert 4 prompts for News generation feature
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
) VALUES

-- ============================================================================
-- 1. NEWS TITLE GENERATION
-- ============================================================================
(
  'generate_news_title',
  'News Article Title Generation',
  'Generates compelling news article titles from aggregated news sources',
  'Based on these news articles about "{keyword}", create a compelling news article title in {language}.

News sources:
{news_context}

Requirements:
- Make it engaging and newsworthy
- Keep it concise (under 100 characters)
- Focus on the most important/latest information
- Use journalistic tone
{website_knowledge}

Return ONLY the title, nothing else.',
  'You are an expert news headline writer who creates engaging, accurate, and attention-grabbing titles for news articles. You prioritize clarity, newsworthiness, and reader engagement.',
  '["keyword", "language", "news_context", "website_knowledge"]',
  TRUE,
  NOW(),
  NOW()
),

-- ============================================================================
-- 2. NEWS ARTICLE CONTENT GENERATION
-- ============================================================================
(
  'generate_news_article',
  'News Article Content Generation',
  'Writes comprehensive news articles from aggregated news sources',
  'You are a professional news writer. Write a comprehensive news article based on the following sources about "{keyword}".

News sources to aggregate:
{news_context}

Requirements:
1. Write in {language}
2. Combine information from multiple sources
3. Use journalistic inverted pyramid style (most important info first)
4. Include key facts: who, what, when, where, why, how
5. Attribute information to sources when relevant
6. Be objective and factual
7. Use proper HTML formatting: <h2> for sections, <p> for paragraphs, <strong> for emphasis
8. Minimum 800 words
9. Do NOT copy directly - rewrite and synthesize information
{website_knowledge}

Article title: {article_title}

Write the complete article now:',
  'You are a professional news writer with expertise in creating objective, well-researched, and engaging news articles. You prioritize accuracy, clarity, and journalistic standards. You excel at synthesizing information from multiple sources into cohesive narratives.',
  '["keyword", "language", "news_context", "article_title", "website_knowledge"]',
  TRUE,
  NOW(),
  NOW()
),

-- ============================================================================
-- 3. NEWS SEO TITLE GENERATION
-- ============================================================================
(
  'generate_news_seo_title',
  'News SEO Title Generation',
  'Creates SEO-optimized titles for news articles',
  'Create an SEO-optimized title for this news article: "{article_title}". 

Requirements:
- Write in {language}
- Under 60 characters
- Keyword-rich and search-friendly
- Engaging and click-worthy
- Maintain journalistic integrity

Return ONLY the title.',
  'You are an SEO expert specializing in news article optimization for search engines. You balance search visibility with journalistic standards and reader engagement.',
  '["article_title", "language"]',
  TRUE,
  NOW(),
  NOW()
),

-- ============================================================================
-- 4. NEWS META DESCRIPTION GENERATION
-- ============================================================================
(
  'generate_news_meta_description',
  'News Meta Description Generation',
  'Creates compelling meta descriptions for news articles',
  'Create a compelling meta description for this news article: "{article_title}". 

Requirements:
- Write in {language}
- 150-160 characters
- Engaging and informative
- Encourage clicks
- Summarize key news points

Return ONLY the description.',
  'You are an SEO expert who writes engaging meta descriptions that drive click-through rates for news articles. You capture the essence of breaking news in concise, compelling language.',
  '["article_title", "language"]',
  TRUE,
  NOW(),
  NOW()
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if all 4 prompts were inserted successfully
SELECT 
  feature_name,
  display_name,
  is_active,
  created_at
FROM ai_prompts
WHERE feature_name LIKE 'generate_news%'
ORDER BY feature_name;

-- Count total prompts after insertion
SELECT COUNT(*) as total_prompts FROM ai_prompts;

-- Show available variables for each news prompt
SELECT 
  feature_name,
  display_name,
  available_variables
FROM ai_prompts
WHERE feature_name LIKE 'generate_news%'
ORDER BY feature_name;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
-- After running this SQL:
-- 1. Backend code will load prompts using loadPrompt('generate_news_title'), etc.
-- 2. Admin can edit prompts via dashboard without code changes
-- 3. Prompts can be disabled by setting is_active = FALSE
-- 4. Variables in {brackets} will be replaced at runtime
-- 
-- Variable Mapping:
-- - {keyword}: Search keyword/topic
-- - {language}: "Vietnamese" or "English"
-- - {news_context}: Aggregated news from APIs
-- - {article_title}: Generated article title
-- - {website_knowledge}: Optional website style guide
-- ============================================================================
