# Write News Feature - Prompt Analysis & Recommendation 📋

## 🔍 Current Status

### ❌ Write News đang HARDCODE prompts

**Location:** `server/routes/ai.ts` → `handleGenerateNews()` (lines 5550-5720)

**Hardcoded Prompts:**
1. **Title Generation Prompt** (line ~5560)
2. **Article Content Prompt** (line ~5600)
3. **SEO Title Prompt** (line ~5672)
4. **Meta Description Prompt** (line ~5698)

---

## 📊 Comparison with Other Features

### ✅ Features Using Database Prompts

All other features load prompts from `ai_prompts` table:

| Feature | Function Call | Feature Name |
|---------|--------------|--------------|
| Rewrite Content | `loadPrompt('rewrite_content')` | Line 673 |
| Expand Content | `loadPrompt('expand_content')` | Line 1168 |
| Generate Outline | `loadPrompt('generate_outline')` | Line 1360 |
| Generate Article | `loadPrompt('generate_article')` | Line 1715 |
| Continue Article | `loadPrompt('continue_article')` | Line 2368 |
| Article Title | `loadPrompt('generate_article_title')` | Line 2806 |
| SEO Title | `loadPrompt('generate_seo_title')` | Line 3444 |
| Meta Description | `loadPrompt('generate_meta_description')` | Line 3570 |
| Toplist Outline | `loadPrompt('generate_toplist_outline')` | Line 4766 |
| Toplist Article | `loadPrompt('generate_toplist')` | Line 5150 |

### ❌ Write News NOT Using Database

**Current Implementation:**
```typescript
// HARDCODED - Line 5560
const titlePrompt = `Based on these news articles about "${keyword}", 
create a compelling news article title in ${language === 'vi' ? 'Vietnamese' : 'English'}.

News sources:
${newsContext}

Requirements:
- Make it engaging and newsworthy
- Keep it concise (under 100 characters)
...`;

// HARDCODED - Line 5600
const articlePrompt = `You are a professional news writer. 
Write a comprehensive news article based on the following sources about "${keyword}".

News sources to aggregate:
${newsContext}

Requirements:
1. Write in ${language === 'vi' ? 'Vietnamese' : 'English'}
2. Combine information from multiple sources
...`;

// HARDCODED - Line 5672
const seoTitlePrompt = `Create an SEO-optimized title for this news article...`;

// HARDCODED - Line 5698
const metaPrompt = `Create a compelling meta description for this news article...`;
```

---

## 🎯 Why This Matters

### Problems with Hardcoded Prompts:

1. **❌ Not Editable**
   - Admin cannot modify prompts through dashboard
   - Need code changes + deployment to update

2. **❌ Inconsistent Architecture**
   - All other features use database prompts
   - Write News is the only exception
   - Breaks system design pattern

3. **❌ No Version Control**
   - Cannot track prompt changes over time
   - Cannot A/B test different prompts
   - No rollback capability

4. **❌ Maintenance Burden**
   - Harder to optimize prompts
   - Cannot test improvements without code changes
   - Slows down iteration cycle

5. **❌ No Admin Control**
   - Admin dashboard shows prompts for all features EXCEPT news
   - Cannot disable/enable news prompts
   - Cannot customize per use case

---

## 💡 Recommended Solution

### ✅ Move to Database-Driven Prompts

Create 4 new prompt entries in `ai_prompts` table:

```sql
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables) VALUES

-- 1. News Title Generation
(
  'generate_news_title',
  'News Article Title Generation',
  'Generates compelling news article titles from news sources',
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
  'You are an expert news headline writer who creates engaging, accurate, and attention-grabbing titles for news articles.',
  '["keyword", "language", "news_context", "website_knowledge"]',
  TRUE
),

-- 2. News Article Content
(
  'generate_news_article',
  'News Article Content Generation',
  'Writes comprehensive news articles from aggregated sources',
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
  'You are a professional news writer with expertise in creating objective, well-researched, and engaging news articles. You prioritize accuracy, clarity, and journalistic standards.',
  '["keyword", "language", "news_context", "article_title", "website_knowledge"]',
  TRUE
),

-- 3. News SEO Title
(
  'generate_news_seo_title',
  'News SEO Title Generation',
  'Creates SEO-optimized titles for news articles',
  'Create an SEO-optimized title for this news article: "{article_title}". Make it {language}, under 60 characters, keyword-rich. Return ONLY the title.',
  'You are an SEO expert specializing in news article optimization for search engines.',
  '["article_title", "language"]',
  TRUE
),

-- 4. News Meta Description
(
  'generate_news_meta_description',
  'News Meta Description Generation',
  'Creates compelling meta descriptions for news articles',
  'Create a compelling meta description for this news article: "{article_title}". Make it {language}, 150-160 characters, engaging. Return ONLY the description.',
  'You are an SEO expert who writes engaging meta descriptions that drive click-through rates.',
  '["article_title", "language"]',
  TRUE
);
```

---

## 🔧 Implementation Plan

### Step 1: Create SQL Migration

**File:** `ADD_NEWS_PROMPTS.sql`

```sql
-- Add prompts for Write News feature
-- These prompts enable admin control over news article generation

INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables) VALUES
-- [Insert 4 prompts from above]
;

-- Verify insertion
SELECT feature_name, display_name, is_active 
FROM ai_prompts 
WHERE feature_name LIKE 'generate_news%';
```

### Step 2: Update Backend Code

**File:** `server/routes/ai.ts` → `handleGenerateNews()`

**Change 1: Load Title Prompt**
```typescript
// BEFORE (Hardcoded)
const titlePrompt = `Based on these news articles...`;

// AFTER (Database-driven)
const titlePromptTemplate = await loadPrompt('generate_news_title');
const titlePrompt = titlePromptTemplate 
  ? titlePromptTemplate.prompt_template
      .replace('{keyword}', keyword)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
      .replace('{news_context}', newsContext)
      .replace('{website_knowledge}', websiteKnowledge ? `\n\nWebsite style guide:\n${websiteKnowledge}` : '')
  : `Based on these news articles...`; // Fallback
```

**Change 2: Load Article Prompt**
```typescript
// BEFORE (Hardcoded)
const articlePrompt = `You are a professional news writer...`;

// AFTER (Database-driven)
const articlePromptTemplate = await loadPrompt('generate_news_article');
const articlePrompt = articlePromptTemplate
  ? articlePromptTemplate.prompt_template
      .replace('{keyword}', keyword)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
      .replace('{news_context}', newsContext)
      .replace('{article_title}', articleTitle)
      .replace('{website_knowledge}', websiteKnowledge ? `\n\nWebsite style guide to follow:\n${websiteKnowledge}` : '')
  : `You are a professional news writer...`; // Fallback
```

**Change 3: Load SEO Title Prompt**
```typescript
// BEFORE (Hardcoded)
const seoTitlePrompt = `Create an SEO-optimized title...`;

// AFTER (Database-driven)
const seoTitlePromptTemplate = await loadPrompt('generate_news_seo_title');
const seoTitlePrompt = seoTitlePromptTemplate
  ? seoTitlePromptTemplate.prompt_template
      .replace('{article_title}', articleTitle)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
  : `Create an SEO-optimized title...`; // Fallback
```

**Change 4: Load Meta Description Prompt**
```typescript
// BEFORE (Hardcoded)
const metaPrompt = `Create a compelling meta description...`;

// AFTER (Database-driven)
const metaPromptTemplate = await loadPrompt('generate_news_meta_description');
const metaPrompt = metaPromptTemplate
  ? metaPromptTemplate.prompt_template
      .replace('{article_title}', articleTitle)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
  : `Create a compelling meta description...`; // Fallback
```

### Step 3: Test & Verify

**Testing Checklist:**
- [ ] Run SQL migration
- [ ] Verify prompts in database
- [ ] Test news generation with database prompts
- [ ] Test fallback when prompts not found
- [ ] Verify in admin dashboard
- [ ] Test prompt editing in admin panel
- [ ] Test disabling prompts
- [ ] Compare output quality before/after

---

## 📊 Benefits After Implementation

### ✅ Consistency
- All features use same architecture
- Uniform prompt management
- Easier to maintain

### ✅ Flexibility
- Admin can edit prompts anytime
- No code deployment needed
- Quick iteration on prompt quality

### ✅ Control
- Enable/disable prompts per feature
- A/B test different versions
- Track changes over time

### ✅ Scalability
- Easy to add new prompt variants
- Support for multiple languages
- Customizable per use case

---

## 🎯 Summary

**Current State:**
- ❌ Write News uses 4 hardcoded prompts
- ❌ Only feature not using database
- ❌ Cannot edit without code changes

**Recommended State:**
- ✅ Move to 4 database prompts
- ✅ Match architecture of other features
- ✅ Enable admin dashboard control

**Impact:**
- **Development Time:** ~2-3 hours
- **Risk:** Low (fallback to hardcoded)
- **Benefit:** High (consistency + flexibility)

**Priority:** 🟡 Medium
- Not blocking functionality
- Improves maintainability
- Better admin experience

---

## 📝 Next Steps

1. **Review this analysis**
2. **Approve SQL migration**
3. **Update backend code**
4. **Test thoroughly**
5. **Deploy to production**
6. **Update documentation**

**Estimated Timeline:** 1 day (including testing)

---

**Analysis Date:** January 26, 2025  
**Feature:** Write News  
**Status:** Recommendation Pending  
**Priority:** Medium
