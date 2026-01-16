# Batch Jobs - Gemini & Keywords Fixes

## ✅ FIXES COMPLETED (Deployed on Jan 16, 2026 13:34)

### 1. Gemini Model Support ✅
**Issue**: Batch jobs với Gemini 2.5 Flash báo lỗi "Incorrect API key provided"

**Root Cause**:
- Frontend gửi `display_name` thay vì `model_id`
- Backend query sai columns trong database

**Fix Applied**:
- Frontend (`client/components/BatchWriteByKeywords.tsx`): Gửi `model_id` = "gemini-2.5-flash"
- Backend (`server/services/aiService.ts`): Query đúng columns `model_id` và `provider`
- Deployment: Fixed Passenger caching bằng cách update trực tiếp `server.mjs`

**Status**: ✅ HOẠT ĐỘNG (đã test thành công)

---

### 2. Keywords Array Split ✅
**Issue**: Keywords hiển thị gộp chung thành 1 tag "máy tính macbook, macbook pro, macbook air" thay vì 3 tags riêng

**Root Cause**:
- Code chỉ lưu `primary_keyword` (string dài)
- Không split và lưu vào `keywords` column (JSON array)

**Fix Applied** (`server/services/articleGenerationService.ts` line 154-161):
```typescript
// Split keyword into array if it contains commas
const keywordsArray = options.keyword.includes(',') 
  ? options.keyword.split(',').map(k => k.trim()).filter(k => k.length > 0)
  : [options.keyword];

const keywordsJson = JSON.stringify(keywordsArray);

// INSERT with keywords column
INSERT INTO articles (
  user_id, title, seo_title, meta_description, content, 
  primary_keyword, keywords, status
) VALUES (?, ?, ?, ?, '', ?, ?, 'draft')
```

**Status**: ✅ CODE DEPLOYED - Cần test với batch job MỚI

---

### 3. Paragraph Formatting ✅
**Issue**: 
- Nội dung bị nhồi nhéc không có cách đoạn
- Đoạn văn quá dài (>100 từ)

**Fix Applied** (`server/services/aiService.ts`):

#### A. Updated Prompts (line 1046-1062):
- Short: "60-100 words per paragraph (never exceed 100)"
- Medium/Long: "80-100 words per paragraph (never exceed 100)"

#### B. Post-Processing Function (line 90-169):
```typescript
function formatAndSplitParagraphs(htmlContent: string): string {
  // 1. Ensure all text wrapped in <p> tags
  // 2. Split paragraphs > 100 words into multiple paragraphs
  // 3. Each new paragraph: 80-100 words
}
```

#### C. Applied in Content Generation (line 1183):
```typescript
// POST-PROCESS: Format paragraphs and split long ones
articleContent = formatAndSplitParagraphs(articleContent);
```

**Status**: ✅ CODE DEPLOYED - Sẽ áp dụng cho batch jobs mới

---

### 4. Title, SEO Title, Meta Description Generation ✅
**Issue**: Chưa tạo tự động khi lưu bài

**Current Implementation** (`server/services/articleGenerationService.ts`):
```typescript
// STEP 1: Generate article title (line 60-77)
const titleResult = await generateArticleTitle(
  options.keyword,
  options.userId,
  options.language,
  options.tone,
  options.model
);

// STEP 2: Generate SEO title (line 82-93)
const seoTitleResult = await generateArticleSEOTitle(
  articleTitle,
  options.keyword,
  options.userId,
  options.language,
  options.model
);

// STEP 3: Generate meta description (line 98-110)
const metaResult = await generateMetaDescription(
  articleTitle,
  options.keyword,
  options.userId,
  options.language,
  options.model
);
```

**Prompt Sources**:
1. Database `ai_prompts` table (priority)
2. Fallback prompts if database empty

**Status**: ✅ CODE ĐÃ CÓ SẴN - Đang hoạt động

---

## 🧪 TESTING CHECKLIST

### Test Case 1: Keywords Array
1. Tạo batch job mới với keywords: `"điện thoại iphone, iphone 15, iphone 16, iphone 17"`
2. Chờ batch job complete
3. Mở bài viết → Check "Từ khóa" section
4. **Expected**: Hiển thị 4 tags riêng biệt:
   - điện thoại iphone
   - iphone 15
   - iphone 16
   - iphone 17

### Test Case 2: Paragraph Formatting
1. Mở bài viết đã tạo
2. Check content:
   - **Expected**: Mỗi đoạn có thẻ `<p>...</p>`
   - **Expected**: Không có đoạn nào >100 từ
   - **Expected**: Các đoạn cách nhau rõ ràng

### Test Case 3: Auto-Generated Metadata
1. Mở bài viết mới tạo
2. Check:
   - **Tiêu đề bài viết**: Không rỗng, có nội dung hấp dẫn
   - **SEO Title** (tab SEO): Không rỗng, tối ưu SEO
   - **Meta Description** (tab SEO): Không rỗng, 150-160 ký tự

---

## 📊 DATABASE SCHEMA

### Table: `articles`
```sql
-- Row 13: Primary keyword (original input)
primary_keyword VARCHAR(500) NULL

-- Row 25: Keywords array (JSON format)
keywords LONGTEXT NULL
-- Example: ["keyword1", "keyword2", "keyword3"]

-- Row 11: SEO title
seo_title VARCHAR(255) NULL

-- Row 24: Meta description
meta_description TEXT NULL
```

---

## 🚀 DEPLOYMENT STATUS

### Files Deployed:
1. ✅ `dist/server/node-build.mjs` → `~/api.volxai.com/server.mjs`
2. ✅ Server restarted at: `Fri Jan 16 13:34:48 +07 2026`

### Build Info:
- Build time: Jan 16, 2026 13:28
- File size: 424.74 KB
- Source map: 774.25 KB

---

## 📝 NOTES

### Why Keywords Weren't Working Before:
1. ❌ Code chỉ INSERT `primary_keyword` 
2. ❌ Không INSERT `keywords` column
3. ❌ Frontend fallback to `primary_keyword` (1 string dài)

### Why It Works Now:
1. ✅ Code split `primary_keyword` by comma
2. ✅ Convert to JSON array: `["kw1", "kw2", "kw3"]`
3. ✅ INSERT both `primary_keyword` AND `keywords`
4. ✅ Frontend parse `keywords` JSON → display multiple tags

### Server Restart Tips:
- Method 1: `touch tmp/restart.txt` (Passenger auto-restart)
- Method 2: Update `server.mjs` file (force reload)
- Method 3: Kill lsnode processes (nuclear option)

---

## 🐛 TROUBLESHOOTING

### If Keywords Still Not Showing:
1. Check database: `SELECT id, primary_keyword, keywords FROM articles ORDER BY id DESC LIMIT 5;`
2. Verify `keywords` column has JSON data
3. Check browser console for parsing errors

### If Titles Still Empty:
1. Check logs: `tail -100 ~/api.volxai.com/stderr.log | grep "ArticleGenService"`
2. Verify AI prompts exist: `SELECT * FROM ai_prompts WHERE feature_name IN ('generate_article_title', 'generate_seo_title', 'generate_meta_description');`
3. Check token balance

### If Paragraphs Still Long:
1. Check content source: View bài viết → Inspect HTML
2. Look for `<p>` tags wrapping content
3. Count words per paragraph (should be ≤100)

---

## 📞 SUPPORT

If issues persist:
1. Share screenshot of "Từ khóa" section
2. Share article ID for inspection
3. Check stderr.log for errors during batch job processing
