# Write News Feature - Prompt Management Refactoring

## 📌 Tổng Quan

Refactoring **Write News feature** từ hardcoded prompts sang database-driven prompts để nhất quán với kiến trúc hệ thống.

---

## 📂 Files Included

### 1. **ADD_NEWS_PROMPTS.sql**
SQL script để add 4 prompts vào `ai_prompts` table:
- `generate_news_title` - Title generation
- `generate_news_article` - Article content
- `generate_news_seo_title` - SEO title
- `generate_news_meta_description` - Meta description

### 2. **WRITE_NEWS_DATABASE_PROMPTS_IMPLEMENTATION.md**
Tài liệu chi tiết:
- Technical details
- Implementation plan
- Testing checklist
- Troubleshooting guide
- Code examples

### 3. **WRITE_NEWS_PROMPTS_QUICK_GUIDE.md**
Quick start guide:
- One-line SQL copy-paste
- Verification queries
- Testing steps
- Benefits summary

### 4. **WRITE_NEWS_PROMPT_ANALYSIS.md**
Analysis & recommendation:
- Current state vs recommended
- Comparison with other features
- Benefits breakdown
- Impact assessment

---

## 🚀 Quick Deploy

### Step 1: Database
```sql
-- Copy từ ADD_NEWS_PROMPTS.sql và chạy trong MySQL
INSERT INTO ai_prompts (...) VALUES (...);
```

### Step 2: Verify
```sql
SELECT feature_name, is_active FROM ai_prompts WHERE feature_name LIKE 'generate_news%';
```

### Step 3: Deploy Code
Code đã được refactor và build:
- ✅ `server/routes/ai.ts` updated
- ✅ Build successful (973.87 KB + 317.90 KB)
- ✅ Ready to deploy

---

## ✅ Changes Summary

### Backend Code (`server/routes/ai.ts`)

**Function:** `handleGenerateNews()` (lines 5392-5760)

**4 Changes Made:**

1. **Title Prompt** (~line 5560)
   ```typescript
   // OLD: const titlePrompt = `Hardcoded string...`;
   // NEW: Load from database
   const titlePromptTemplate = await loadPrompt('generate_news_title');
   const titlePrompt = titlePromptTemplate ? titlePromptTemplate.prompt_template... : fallback;
   ```

2. **Article Prompt** (~line 5610)
   ```typescript
   // OLD: const articlePrompt = `Hardcoded string...`;
   // NEW: Load from database
   const articlePromptTemplate = await loadPrompt('generate_news_article');
   const articlePrompt = articlePromptTemplate ? ... : fallback;
   ```

3. **SEO Title Prompt** (~line 5687)
   ```typescript
   // OLD: const seoTitlePrompt = `Hardcoded string...`;
   // NEW: Load from database
   const seoTitlePromptTemplate = await loadPrompt('generate_news_seo_title');
   const seoTitlePrompt = seoTitlePromptTemplate ? ... : fallback;
   ```

4. **Meta Description Prompt** (~line 5722)
   ```typescript
   // OLD: const metaPrompt = `Hardcoded string...`;
   // NEW: Load from database
   const metaPromptTemplate = await loadPrompt('generate_news_meta_description');
   const metaPrompt = metaPromptTemplate ? ... : fallback;
   ```

---

## 📊 Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Architecture** | ❌ Hardcoded strings | ✅ Database-driven |
| **Admin Edit** | ❌ Need code changes | ✅ Edit via dashboard |
| **Consistency** | ❌ Only feature with hardcoded | ✅ Matches all other features |
| **Testing** | ❌ Hard to A/B test | ✅ Easy prompt testing |
| **Deployment** | ❌ Code deploy for changes | ✅ Database update only |
| **Fallback** | ❌ No fallback | ✅ Fallback to hardcoded |

---

## 🎯 Benefits

### ✅ Consistency
- All features now use same prompt management
- Uniform architecture across system
- Easier to maintain

### ✅ Flexibility
- Admin can edit prompts anytime
- No code deployment for prompt changes
- Quick iteration on quality

### ✅ Control
- Enable/disable prompts per feature
- A/B test different versions
- Track changes over time

### ✅ Safety
- Fallback mechanism if database fails
- Feature continues working
- No breaking changes

---

## 🧪 Testing Checklist

- [ ] **Database Migration**
  - [ ] Run ADD_NEWS_PROMPTS.sql
  - [ ] Verify 4 prompts added
  - [ ] Check `is_active = TRUE`

- [ ] **Feature Testing**
  - [ ] Generate news article (English)
  - [ ] Generate news article (Vietnamese)
  - [ ] Test with different AI models
  - [ ] Verify all 4 outputs:
    - [ ] Title
    - [ ] Content
    - [ ] SEO Title
    - [ ] Meta Description

- [ ] **Admin Dashboard**
  - [ ] See 4 news prompts in list
  - [ ] Edit one prompt
  - [ ] Save and test generation
  - [ ] Verify changes applied

- [ ] **Error Handling**
  - [ ] Test with disabled prompts
  - [ ] Verify fallback works
  - [ ] Check console logs

---

## 📖 Documentation

### For Developers
Read: **WRITE_NEWS_DATABASE_PROMPTS_IMPLEMENTATION.md**
- Detailed technical explanation
- Code examples
- Troubleshooting guide

### For Quick Deploy
Read: **WRITE_NEWS_PROMPTS_QUICK_GUIDE.md**
- Fast deployment steps
- Copy-paste SQL
- Quick verification

### For Analysis
Read: **WRITE_NEWS_PROMPT_ANALYSIS.md**
- Why this change was needed
- Comparison with other features
- Impact assessment

---

## 🔧 Troubleshooting

### Issue: Prompts not loading

**Check:**
1. SQL migration completed? → Run verification query
2. Database connection OK? → Check server logs
3. Feature names correct? → Must match exactly
4. Prompts active? → `is_active = TRUE`

### Issue: Generation fails

**Check:**
1. API keys valid? (OpenAI, Gemini, News API)
2. Search API working? (SerpAPI/Serper/Zenserp)
3. Network connection OK?
4. Check console for errors

### Issue: Old prompts still used

**Solution:**
1. Clear backend cache
2. Restart server
3. Verify database query returns prompts
4. Check fallback isn't being triggered

---

## 📝 Variable Mapping

Prompts use these variables (replaced at runtime):

| Variable | Description | Used By |
|----------|-------------|---------|
| `{keyword}` | Search keyword/topic | Title, Article |
| `{language}` | "Vietnamese" or "English" | All 4 prompts |
| `{news_context}` | Aggregated news snippets | Title, Article |
| `{article_title}` | Generated title | Article, SEO, Meta |
| `{website_knowledge}` | Optional style guide | Title, Article |

---

## 🎉 Status

**Implementation:** ✅ COMPLETE  
**Build Status:** ✅ SUCCESSFUL  
**Ready for Deploy:** ✅ YES  

**Next Step:** Run SQL migration on production database

---

## 📧 Support

If you encounter issues:
1. Check troubleshooting section
2. Verify SQL migration completed
3. Check server logs for errors
4. Test with fallback prompts

---

**Last Updated:** January 14, 2026  
**Feature:** Write News (News API Integration)  
**Version:** 1.5  
**Status:** Production Ready ✅
