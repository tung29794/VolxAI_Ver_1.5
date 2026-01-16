# 📌 AI Prompts Quick Reference Card

## 🎯 5 AI Functions Available

| Feature | Feature Name (Technical) | API Endpoint | Token Cost |
|---------|-------------------------|--------------|------------|
| 📝 Expand Content | `expand_content` | `/api/ai/write-more` | 500 |
| ✏️ Rewrite Content | `rewrite_content` | `/api/ai/rewrite` | 800 |
| 📰 Generate Article | `generate_article` | `/api/ai/generate-article` | Varies |
| 🏷️ Generate SEO Title | `generate_seo_title` | `/api/ai/generate-seo-title` | 300 |
| 📋 Generate Meta Description | `generate_meta_description` | `/api/ai/generate-meta-description` | 400 |

---

## 🔧 Quick Commands

### Import Prompts
```bash
./import-prompts.sh
```

### Test All Functions
```bash
./test-ai-functions.sh
```

### Deploy Backend Only
```bash
npm run build:server
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

### Deploy Frontend Only
```bash
npm run build:client
rsync -avz --delete -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/
```

### Check Server Logs
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
tail -f /home/jybcaorr/api.volxai.com/logs/error.log
```

---

## 📊 Database Quick Queries

### View All Prompts
```sql
SELECT feature_name, display_name, is_active FROM ai_prompts;
```

### Check Active Prompts
```sql
SELECT COUNT(*) FROM ai_prompts WHERE is_active = TRUE;
```

### View Prompt Details
```sql
SELECT * FROM ai_prompts WHERE feature_name = 'rewrite_content';
```

### Toggle Prompt Active
```sql
UPDATE ai_prompts SET is_active = !is_active WHERE feature_name = 'rewrite_content';
```

### Delete All Prompts (DANGER!)
```sql
DELETE FROM ai_prompts;
```

---

## 🔑 Variables per Function

### expand_content
- `{text}` - Text to expand
- `{language_instruction}` - Language guidance

### rewrite_content
- `{text}` - Text to rewrite
- `{style}` - Style (standard, shorter, longer, easy, creative, funny, casual, friendly, professional)
- `{language_instruction}` - Language guidance

### generate_article
- `{keyword}` - Main keyword
- `{language_instruction}` - Language guidance
- `{tone}` - Tone (professional, casual, etc.)

### generate_seo_title
- `{keyword}` - Main keyword
- `{language_instruction}` - Language guidance

### generate_meta_description
- `{keyword}` - Main keyword
- `{language_instruction}` - Language guidance
- `{content_context}` - Optional content preview

---

## 🌐 URLs

- **Production Site:** https://volxai.com
- **Admin Panel:** https://volxai.com/admin
- **API Base:** https://api.volxai.com
- **AI Prompts Admin:** https://volxai.com/admin (tab "AI Prompts")

---

## 🔐 Credentials

### Database
- **Host:** 103.221.221.67:3306
- **Database:** jybcaorr_lisacontentdbapi
- **User:** jybcaorr_lisacontentdbapi

### SSH
- **Host:** ghf57-22175.azdigihost.com
- **Port:** 2210
- **User:** jybcaorr
- **Backend Path:** /home/jybcaorr/api.volxai.com/
- **Frontend Path:** /home/jybcaorr/public_html/

---

## ⚡ Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token in localStorage: `authToken` |
| 402 Insufficient tokens | Add tokens via Admin → Users |
| 503 API key not configured | Add OpenAI key via Admin → API Keys |
| CORS error | Check server/index.ts has PATCH in methods |
| Prompt not loading | Check `is_active = TRUE` in database |
| Dropdown empty | Clear cache and rebuild frontend |

---

## 📝 Testing Checklist

```
[ ] Backend deployed successfully
[ ] Server restarted
[ ] Prompts imported to database
[ ] Admin UI shows 5 prompts
[ ] Can create new prompt via UI
[ ] Can edit existing prompt
[ ] Can toggle active/inactive
[ ] Can delete prompt
[ ] Rewrite function works
[ ] Generate article works
[ ] Generate SEO title works
[ ] Generate meta description works
[ ] Write more works
[ ] Token deduction works
[ ] All tests pass
```

---

**Print this card and keep it handy for quick reference! 🎯**
