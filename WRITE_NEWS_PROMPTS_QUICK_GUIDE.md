# Write News - Database Prompts Quick Guide 🚀

## ⚡ Quick Start

### 1️⃣ Add Prompts to Database

**Copy paste SQL này vào database:**

```sql
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active, created_at, updated_at) VALUES
('generate_news_title', 'News Article Title Generation', 'Generates compelling news article titles from aggregated news sources', 'Based on these news articles about "{keyword}", create a compelling news article title in {language}.\n\nNews sources:\n{news_context}\n\nRequirements:\n- Make it engaging and newsworthy\n- Keep it concise (under 100 characters)\n- Focus on the most important/latest information\n- Use journalistic tone\n{website_knowledge}\n\nReturn ONLY the title, nothing else.', 'You are an expert news headline writer who creates engaging, accurate, and attention-grabbing titles for news articles. You prioritize clarity, newsworthiness, and reader engagement.', '[\"keyword\", \"language\", \"news_context\", \"website_knowledge\"]', TRUE, NOW(), NOW()),
('generate_news_article', 'News Article Content Generation', 'Writes comprehensive news articles from aggregated news sources', 'You are a professional news writer. Write a comprehensive news article based on the following sources about \"{keyword}\".\n\nNews sources to aggregate:\n{news_context}\n\nRequirements:\n1. Write in {language}\n2. Combine information from multiple sources\n3. Use journalistic inverted pyramid style (most important info first)\n4. Include key facts: who, what, when, where, why, how\n5. Attribute information to sources when relevant\n6. Be objective and factual\n7. Use proper HTML formatting: <h2> for sections, <p> for paragraphs, <strong> for emphasis\n8. Minimum 800 words\n9. Do NOT copy directly - rewrite and synthesize information\n{website_knowledge}\n\nArticle title: {article_title}\n\nWrite the complete article now:', 'You are a professional news writer with expertise in creating objective, well-researched, and engaging news articles. You prioritize accuracy, clarity, and journalistic standards. You excel at synthesizing information from multiple sources into cohesive narratives.', '[\"keyword\", \"language\", \"news_context\", \"article_title\", \"website_knowledge\"]', TRUE, NOW(), NOW()),
('generate_news_seo_title', 'News SEO Title Generation', 'Creates SEO-optimized titles for news articles', 'Create an SEO-optimized title for this news article: \"{article_title}\". \n\nRequirements:\n- Write in {language}\n- Under 60 characters\n- Keyword-rich and search-friendly\n- Engaging and click-worthy\n- Maintain journalistic integrity\n\nReturn ONLY the title.', 'You are an SEO expert specializing in news article optimization for search engines. You balance search visibility with journalistic standards and reader engagement.', '[\"article_title\", \"language\"]', TRUE, NOW(), NOW()),
('generate_news_meta_description', 'News Meta Description Generation', 'Creates compelling meta descriptions for news articles', 'Create a compelling meta description for this news article: \"{article_title}\". \n\nRequirements:\n- Write in {language}\n- 150-160 characters\n- Engaging and informative\n- Encourage clicks\n- Summarize key news points\n\nReturn ONLY the description.', 'You are an SEO expert who writes engaging meta descriptions that drive click-through rates for news articles. You capture the essence of breaking news in concise, compelling language.', '[\"article_title\", \"language\"]', TRUE, NOW(), NOW());
```

### 2️⃣ Verify

```sql
SELECT feature_name, display_name, is_active 
FROM ai_prompts 
WHERE feature_name LIKE 'generate_news%'
ORDER BY feature_name;
```

**Should show 4 rows ✅**

### 3️⃣ Deploy

Code đã được refactor và build thành công:
- ✅ Frontend: 973.87 KB
- ✅ Backend: 317.90 KB

Deploy như bình thường!

---

## 📋 What Changed

| Component | Before | After |
|-----------|--------|-------|
| Title Prompt | ❌ Hardcoded | ✅ Database (`generate_news_title`) |
| Article Prompt | ❌ Hardcoded | ✅ Database (`generate_news_article`) |
| SEO Title Prompt | ❌ Hardcoded | ✅ Database (`generate_news_seo_title`) |
| Meta Desc Prompt | ❌ Hardcoded | ✅ Database (`generate_news_meta_description`) |

---

## ✅ Benefits

- 🎛️ **Edit via Admin Dashboard** - No code changes needed
- 🔄 **Consistent Architecture** - Matches all other features
- 🧪 **Easy Testing** - A/B test different prompts
- 🚀 **Quick Iteration** - Improve prompts instantly

---

## 🧪 Testing

1. **Generate News Article** (English + Vietnamese)
2. **Verify all 4 components generated:**
   - Title
   - Content
   - SEO Title
   - Meta Description
3. **Test in Admin Dashboard** - Edit one prompt and verify changes

---

## 📁 Files

- **SQL:** `ADD_NEWS_PROMPTS.sql`
- **Backend:** `server/routes/ai.ts` (handleGenerateNews)
- **Docs:** `WRITE_NEWS_DATABASE_PROMPTS_IMPLEMENTATION.md`

---

## 🎯 Next Steps

1. [ ] Run SQL migration
2. [ ] Test Write News feature
3. [ ] Verify admin dashboard
4. [ ] Done! 🎉

---

**Status:** ✅ READY FOR PRODUCTION  
**Build:** ✅ SUCCESSFUL  
**Date:** January 14, 2026
