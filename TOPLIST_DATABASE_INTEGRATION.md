# 🔧 Toplist Outline Database Integration

## ✅ Status: COMPLETED

Toplist prompts **ĐÃ CÓ TRONG DATABASE** và code **ĐÃ ĐƯỢC CẤU HÌNH** để load từ database.

## 📊 Database Status

```sql
SELECT feature_name, display_name, is_active FROM ai_prompts WHERE feature_name LIKE '%toplist%';
```

**Result:**
| feature_name | display_name | is_active |
|--------------|--------------|-----------|
| generate_toplist_title | Tạo tiêu đề Toplist | 1 |
| generate_toplist_outline | Tạo dàn ý Toplist | 1 |
| generate_toplist_article | Tạo nội dung bài Toplist | 1 |

✅ All 3 prompts active and ready to use!

## 📝 Code Implementation

### 1. Generate Toplist Outline (Line ~3488)

```typescript
// Load outline prompt from database
const outlinePromptTemplate = await loadPrompt('generate_toplist_outline');

if (outlinePromptTemplate) {
  outlineSystemPrompt = outlinePromptTemplate.system_prompt;
  
  outlineUserPrompt = interpolatePrompt(outlinePromptTemplate.prompt_template, {
    keyword: keyword,
    language: languageNames[language] || "Vietnamese",
    tone: tone,
    item_count: itemCount.toString(),
    h3_per_h2: h3PerH2.toString(),
  });
} else {
  // FALLBACK to hardcoded prompt
}
```

### 2. Generate Toplist Article (Line ~3569)

```typescript
// Load prompt from database
const articlePromptTemplate = await loadPrompt('generate_toplist_article');

if (articlePromptTemplate) {
  systemPrompt = interpolatePrompt(articlePromptTemplate.system_prompt, {
    language: language === "vi" ? "Vietnamese" : language,
    tone: tone,
    length_instruction: lengthInstruction,
    paragraphs_per_item: lengthConfig.paragraphsPerItem.toString(),
  });
  
  userPrompt = interpolatePrompt(articlePromptTemplate.prompt_template, {
    keyword: keyword,
    language: language === "vi" ? "Vietnamese" : language,
    tone: tone,
    length_instruction: lengthInstruction,
    outline_instruction: outlineInstruction,
    paragraphs_per_item: lengthConfig.paragraphsPerItem.toString(),
    paragraph_words: lengthConfig.paragraphWords.toString(),
    min_words: lengthConfig.minWords.toString(),
  });
} else {
  // FALLBACK to hardcoded prompt
}
```

## 🔍 Debug Logging Added

Enhanced `loadPrompt()` function with detailed logging:

```typescript
async function loadPrompt(featureName: string): Promise<AIPromptTemplate | null> {
  try {
    console.log(`🔍 Loading prompt for feature: ${featureName}`);
    const prompt = await queryOne<any>(
      `SELECT prompt_template, system_prompt, available_variables
       FROM ai_prompts
       WHERE feature_name = ? AND is_active = TRUE`,
      [featureName]
    );

    if (prompt) {
      console.log(`✅ Prompt loaded successfully for ${featureName}`);
      return { /* ... */ };
    }

    console.log(`⚠️ No prompt found for ${featureName}, will use fallback`);
    return null;
  } catch (error) {
    console.error(`❌ Error loading prompt for ${featureName}:`, error);
    return null;
  }
}
```

## 🧪 Testing

### Test Generate Toplist Article

1. Go to **Write Toplist** page
2. Enter topic: "Top 10 xe điện tốt nhất"
3. Click "Generate Article"

### Expected Logs

```
🔍 Loading prompt for feature: generate_toplist_outline
✅ Prompt loaded successfully for generate_toplist_outline
📝 Auto-generating toplist outline...
✅ Auto-generated toplist outline successfully

🔍 Loading prompt for feature: generate_toplist_article
✅ Prompt loaded successfully for generate_toplist_article
📥 Received toplist article request: { ... }
```

### If Using Fallback (Problem)

```
🔍 Loading prompt for feature: generate_toplist_article
⚠️ No prompt found for generate_toplist_article, will use fallback
```

This means:
- Database connection issue
- `queryOne()` function not working
- `feature_name` mismatch

## 📁 Database Connection

**Production Server:**
- Host: `localhost`
- User: `jybcaorr_lisaaccountcontentapi`
- Password: `ISlc)_+hKk+g2.m^`
- Database: `jybcaorr_lisacontentdbapi`

**.env file should have:**
```env
DB_HOST=localhost
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=ISlc)_+hKk+g2.m^
DB_NAME=jybcaorr_lisacontentdbapi
```

## 🚀 Deployment

### Files Updated
- `server/routes/ai.ts` - Added logging to `loadPrompt()`

### Deployment Steps
1. ✅ Build: `npm run build`
2. ✅ Upload: `scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:~/api.volxai.com/`
3. ✅ Restart: `touch ~/api.volxai.com/.lsphp_restart.txt`

### Monitoring Logs
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -f ~/api.volxai.com/stderr.log"
```

Look for:
- `🔍 Loading prompt for feature: generate_toplist_article`
- `✅ Prompt loaded successfully` (SUCCESS)
- `⚠️ No prompt found` (PROBLEM - using fallback)

## ✅ Verification Checklist

- [x] Database has all 3 toplist prompts
- [x] All prompts are active (`is_active = 1`)
- [x] Code loads prompts using `loadPrompt()`
- [x] Code has fallback if prompt not found
- [x] Added debug logging for troubleshooting
- [x] Build successful
- [x] Deployed to production
- [ ] **Test and verify logs show "Prompt loaded successfully"**

## 🎯 Next Steps

1. **Test Write Toplist** on production
2. **Check stderr.log** for prompt loading messages
3. **If sees "Prompt loaded successfully"** → Everything works! ✅
4. **If sees "No prompt found"** → Database connection issue, investigate further

## 📝 Related Files

- `ADD_TOPLIST_PROMPTS.sql` - SQL script with prompt definitions
- `server/routes/ai.ts` - Backend API implementation
- `run_toplist_sql.php` - PHP script to insert prompts (already done)

---

**Date:** 2026-01-13  
**Status:** ✅ Database prompts ready, code updated, deployed to production  
**Build:** `dist/server/node-build.mjs 255.17 kB`  
**Awaiting:** User testing to verify prompt loading works correctly
