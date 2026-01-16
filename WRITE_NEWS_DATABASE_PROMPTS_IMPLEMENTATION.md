# Write News Feature - Database Prompts Implementation ✅

## 📋 Overview

Đã refactor **Write News feature** để sử dụng database-driven prompts giống như tất cả các features khác trong hệ thống.

**Date:** January 14, 2026  
**Status:** ✅ HOÀN THÀNH  
**Build:** ✅ SUCCESSFUL (973.87 KB frontend, 317.90 KB backend)

---

## 🎯 What Changed

### ❌ BEFORE (Hardcoded Prompts)
```typescript
// Prompts were literal strings in code
const titlePrompt = `Based on these news articles...`;
const articlePrompt = `You are a professional news writer...`;
const seoTitlePrompt = `Create an SEO-optimized title...`;
const metaPrompt = `Create a compelling meta description...`;
```

### ✅ AFTER (Database-Driven Prompts)
```typescript
// Prompts loaded from ai_prompts table
const titlePromptTemplate = await loadPrompt('generate_news_title');
const articlePromptTemplate = await loadPrompt('generate_news_article');
const seoTitlePromptTemplate = await loadPrompt('generate_news_seo_title');
const metaPromptTemplate = await loadPrompt('generate_news_meta_description');
```

---

## 📂 Files Modified

### 1. **ADD_NEWS_PROMPTS.sql** (NEW)
SQL script để add 4 prompts vào database:
- `generate_news_title` - Tạo tiêu đề từ news sources
- `generate_news_article` - Viết nội dung bài tin tức
- `generate_news_seo_title` - Tạo SEO title
- `generate_news_meta_description` - Tạo meta description

### 2. **server/routes/ai.ts** (MODIFIED)
Function: `handleGenerateNews()` (lines ~5392-5760)

**Changes Made:**
- ✅ Line ~5560: Title prompt → Load from database
- ✅ Line ~5610: Article prompt → Load from database  
- ✅ Line ~5687: SEO title prompt → Load from database
- ✅ Line ~5722: Meta description prompt → Load from database

---

## 🚀 How to Deploy

### Step 1: Run SQL Migration

Chạy file **ADD_NEWS_PROMPTS.sql** trong database của bạn:

```bash
# Option 1: Via MySQL command line
mysql -u your_user -p your_database < ADD_NEWS_PROMPTS.sql

# Option 2: Via phpMyAdmin
# - Open phpMyAdmin
# - Select database: jybcaorr_lisacontentdbapi
# - Go to SQL tab
# - Copy paste nội dung ADD_NEWS_PROMPTS.sql
# - Click "Go"

# Option 3: Via MySQL Workbench
# - Open MySQL Workbench
# - Connect to database
# - File > Open SQL Script
# - Select ADD_NEWS_PROMPTS.sql
# - Execute (⚡ icon)
```

### Step 2: Verify Prompts Added

Chạy query này để verify:

```sql
-- Check all news prompts
SELECT 
  feature_name,
  display_name,
  is_active,
  created_at
FROM ai_prompts
WHERE feature_name LIKE 'generate_news%'
ORDER BY feature_name;

-- Should return 4 rows:
-- generate_news_article
-- generate_news_meta_description
-- generate_news_seo_title
-- generate_news_title
```

**Expected Output:**
```
+-----------------------------------+----------------------------------+----------+---------------------+
| feature_name                      | display_name                     | is_active| created_at          |
+-----------------------------------+----------------------------------+----------+---------------------+
| generate_news_article             | News Article Content Generation  | 1        | 2026-01-14 XX:XX:XX |
| generate_news_meta_description    | News Meta Description Generation | 1        | 2026-01-14 XX:XX:XX |
| generate_news_seo_title           | News SEO Title Generation        | 1        | 2026-01-14 XX:XX:XX |
| generate_news_title               | News Article Title Generation    | 1        | 2026-01-14 XX:XX:XX |
+-----------------------------------+----------------------------------+----------+---------------------+
```

### Step 3: Deploy Backend Code

Code đã được refactor và build thành công. Deploy như bình thường:

```bash
# Build đã chạy thành công
npm run build

# Deploy files:
# - dist/server/node-build.mjs (317.90 KB) → Server
# - dist/spa/* (973.87 KB) → Frontend
```

### Step 4: Test Write News Feature

1. **Open App** → Account page
2. **Select "Viết Tin Tức"** tab
3. **Test generation:**
   - Keyword: "AI technology 2026"
   - Language: English
   - Model: GPT-4o Mini
   - Click "Tạo Bài Viết"

4. **Verify:**
   - ✅ Title generated
   - ✅ Article content generated
   - ✅ SEO title created
   - ✅ Meta description created
   - ✅ No errors in console

---

## 🔍 Technical Details

### Prompt Loading Pattern

**Code in handleGenerateNews():**

```typescript
// 1. TITLE GENERATION
const titlePromptTemplate = await loadPrompt('generate_news_title');
const titlePrompt = titlePromptTemplate 
  ? titlePromptTemplate.prompt_template
      .replace('{keyword}', keyword)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
      .replace('{news_context}', newsContext)
      .replace('{website_knowledge}', websiteKnowledge ? `\n\nWebsite style guide:\n${websiteKnowledge}` : '')
  : `[Fallback hardcoded prompt]`; // Used if database query fails

// 2. ARTICLE GENERATION
const articlePromptTemplate = await loadPrompt('generate_news_article');
const articlePrompt = articlePromptTemplate
  ? articlePromptTemplate.prompt_template
      .replace('{keyword}', keyword)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
      .replace('{news_context}', newsContext)
      .replace('{article_title}', articleTitle)
      .replace('{website_knowledge}', websiteKnowledge ? `\n\nWebsite style guide to follow:\n${websiteKnowledge}` : '')
  : `[Fallback hardcoded prompt]`;

// 3. SEO TITLE
const seoTitlePromptTemplate = await loadPrompt('generate_news_seo_title');
const seoTitlePrompt = seoTitlePromptTemplate
  ? seoTitlePromptTemplate.prompt_template
      .replace('{article_title}', articleTitle)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
  : `[Fallback hardcoded prompt]`;

// 4. META DESCRIPTION
const metaPromptTemplate = await loadPrompt('generate_news_meta_description');
const metaPrompt = metaPromptTemplate
  ? metaPromptTemplate.prompt_template
      .replace('{article_title}', articleTitle)
      .replace('{language}', language === 'vi' ? 'Vietnamese' : 'English')
  : `[Fallback hardcoded prompt]`;
```

### Variable Substitution

Each prompt template uses placeholders that are replaced at runtime:

| Variable | Description | Used In |
|----------|-------------|---------|
| `{keyword}` | Search keyword/topic | Title, Article |
| `{language}` | "Vietnamese" or "English" | All 4 prompts |
| `{news_context}` | Aggregated news from APIs | Title, Article |
| `{article_title}` | Generated article title | Article, SEO Title, Meta Desc |
| `{website_knowledge}` | Optional website style guide | Title, Article |

### Fallback Mechanism

**Safety Feature:**
- If database query fails → Uses hardcoded fallback
- Ensures feature continues working even if database issue
- Logs warning but doesn't crash

```typescript
const prompt = template 
  ? template.prompt_template.replace(...)  // Use database
  : `Hardcoded fallback prompt...`;        // Use fallback
```

---

## 🎨 Admin Dashboard Integration

### ✅ Prompts Now Editable via Admin

After SQL migration, admin users can:

1. **View News Prompts**
   - Go to Admin Dashboard → AI Prompts Management
   - See 4 new prompts for News feature
   - Display names:
     - "News Article Title Generation"
     - "News Article Content Generation"
     - "News SEO Title Generation"
     - "News Meta Description Generation"

2. **Edit Prompts**
   - Click "Edit" on any news prompt
   - Modify `prompt_template` or `system_prompt`
   - Save changes
   - **No code deployment needed!**

3. **Enable/Disable**
   - Toggle `is_active` to enable/disable prompts
   - Disabled prompts use fallback hardcoded version

4. **A/B Testing**
   - Create multiple versions
   - Test different prompt strategies
   - Compare output quality

---

## 📊 Benefits

### ✅ Consistency
- **Before:** Write News was the only feature with hardcoded prompts
- **After:** All features use same architecture
- Uniform prompt management across system

### ✅ Flexibility
- Admin can edit prompts without code changes
- Quick iteration on prompt quality
- Test improvements instantly

### ✅ Maintainability
- No code deployment for prompt updates
- Version control in database
- Easy rollback if needed

### ✅ Scalability
- Add new prompt variants easily
- Support multiple languages
- Customizable per use case

---

## 🧪 Testing Checklist

### Post-Deployment Testing

- [ ] **SQL Migration**
  - [ ] 4 prompts added to database
  - [ ] All prompts have `is_active = TRUE`
  - [ ] No SQL errors

- [ ] **Backend Code**
  - [ ] Build successful (✅ Done)
  - [ ] No TypeScript errors (✅ Done)
  - [ ] Server starts without errors

- [ ] **Write News Feature**
  - [ ] Generate news article (English)
  - [ ] Generate news article (Vietnamese)
  - [ ] Test with GPT-3.5 Turbo
  - [ ] Test with GPT-4o Mini
  - [ ] Test with Gemini 2.0 Flash
  - [ ] Verify title generation
  - [ ] Verify article content
  - [ ] Verify SEO metadata

- [ ] **Admin Dashboard**
  - [ ] See 4 news prompts in list
  - [ ] Edit one prompt
  - [ ] Save and test generation
  - [ ] Verify changes reflected
  - [ ] Test disable/enable prompt

- [ ] **Error Handling**
  - [ ] Test with invalid API keys
  - [ ] Test with disabled prompts
  - [ ] Verify fallback works
  - [ ] Check console logs

---

## 📝 Prompt Details

### 1. generate_news_title

**Purpose:** Generate compelling news article titles from aggregated news sources

**Variables:**
- `{keyword}` - Search topic
- `{language}` - Vietnamese or English
- `{news_context}` - Aggregated news snippets
- `{website_knowledge}` - Optional style guide

**System Prompt:**
> "You are an expert news headline writer who creates engaging, accurate, and attention-grabbing titles for news articles. You prioritize clarity, newsworthiness, and reader engagement."

---

### 2. generate_news_article

**Purpose:** Write comprehensive news articles from multiple sources

**Variables:**
- `{keyword}` - Search topic
- `{language}` - Vietnamese or English
- `{news_context}` - Aggregated news snippets
- `{article_title}` - Generated title
- `{website_knowledge}` - Optional style guide

**System Prompt:**
> "You are a professional news writer with expertise in creating objective, well-researched, and engaging news articles. You prioritize accuracy, clarity, and journalistic standards. You excel at synthesizing information from multiple sources into cohesive narratives."

---

### 3. generate_news_seo_title

**Purpose:** Create SEO-optimized titles for news articles

**Variables:**
- `{article_title}` - Original article title
- `{language}` - Vietnamese or English

**System Prompt:**
> "You are an SEO expert specializing in news article optimization for search engines. You balance search visibility with journalistic standards and reader engagement."

---

### 4. generate_news_meta_description

**Purpose:** Create compelling meta descriptions for news articles

**Variables:**
- `{article_title}` - Original article title
- `{language}` - Vietnamese or English

**System Prompt:**
> "You are an SEO expert who writes engaging meta descriptions that drive click-through rates for news articles. You capture the essence of breaking news in concise, compelling language."

---

## 🔧 Troubleshooting

### Issue: Prompts not loading from database

**Symptoms:**
- Feature still uses old hardcoded prompts
- No database query in logs

**Solutions:**
1. Verify SQL migration ran successfully
2. Check database connection
3. Verify `ai_prompts` table exists
4. Check `feature_name` matches exactly:
   - `generate_news_title`
   - `generate_news_article`
   - `generate_news_seo_title`
   - `generate_news_meta_description`

### Issue: Fallback prompts being used

**Symptoms:**
- Console shows: "Using fallback prompt"
- Database has prompts but not loading

**Solutions:**
1. Check `is_active = TRUE` in database
2. Verify no typos in `feature_name`
3. Test `loadPrompt()` function directly
4. Check database query permissions

### Issue: Generation fails

**Symptoms:**
- Error during article generation
- Incomplete content

**Solutions:**
1. Check API keys (OpenAI, Gemini)
2. Verify News API key valid
3. Test with different model
4. Check network connectivity
5. Verify search API (SerpAPI/Serper/Zenserp)

---

## 📚 Related Files

- **SQL Migration:** `ADD_NEWS_PROMPTS.sql`
- **Backend Code:** `server/routes/ai.ts` (lines 5392-5760)
- **Frontend Form:** `client/components/WriteNewsForm.tsx`
- **Documentation:** `WRITE_NEWS_FEATURE_COMPLETE.md`
- **Analysis Doc:** `WRITE_NEWS_PROMPT_ANALYSIS.md`

---

## ✅ Completion Checklist

- [x] Create SQL migration file
- [x] Refactor title prompt to use database
- [x] Refactor article prompt to use database
- [x] Refactor SEO title prompt to use database
- [x] Refactor meta description prompt to use database
- [x] Add fallback mechanism for each prompt
- [x] Build project successfully
- [x] Create implementation documentation
- [ ] Run SQL migration on production database
- [ ] Test Write News feature post-deployment
- [ ] Verify admin dashboard shows new prompts
- [ ] Test prompt editing functionality

---

## 🎉 Summary

**Write News feature** now follows the same database-driven prompt architecture as all other features in VolxAI system.

**Before:**
- ❌ 4 hardcoded prompts
- ❌ Need code changes to update
- ❌ Not editable via admin dashboard

**After:**
- ✅ 4 database prompts
- ✅ Edit via admin dashboard
- ✅ Consistent with other features
- ✅ Fallback mechanism for safety
- ✅ Build successful ✅

---

**Implementation Date:** January 14, 2026  
**Developer:** VolxAI Team  
**Status:** ✅ COMPLETE - Ready for Production  
**Next Step:** Run ADD_NEWS_PROMPTS.sql on production database
