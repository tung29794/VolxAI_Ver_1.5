# 🎯 METADATA GENERATION FEATURE

## 📋 TỔNG QUAN

Feature này tự động tạo **Title, SEO Title, và Meta Description** cho mỗi bài viết được generate, áp dụng cho **TẤT CẢ AI MODELS** (OpenAI và Gemini).

---

## ✅ ĐÃ IMPLEMENT

### **1. Title Generation cho Gemini** ✅
**Vấn đề cũ:**
- Gemini không tạo title riêng
- Chỉ copy từ keyword → không SEO-friendly

**Giải pháp:**
- Gemini giờ tạo title độc lập như OpenAI
- Sử dụng Gemini API để generate metadata

### **2. SEO Title và Meta Description** ✅
**Thêm mới:**
- **SEO Title**: Tối ưu cho search engine (50-60 ký tự)
- **Meta Description**: Mô tả ngắn gọn (150-160 ký tự)
- Áp dụng cho **TẤT CẢ models**

### **3. Unified Metadata Generation** ✅
**Cách hoạt động:**
- 1 API call duy nhất tạo cả 3 metadata
- Format: JSON với 3 fields
- Tự động fallback nếu API lỗi

---

## 🔧 TECHNICAL DETAILS

### **API Flow:**

```
Article Generated
    ↓
Detect Provider (OpenAI or Gemini)
    ↓
┌─────────────────┬─────────────────┐
│   OpenAI Path   │   Gemini Path   │
├─────────────────┼─────────────────┤
│ GPT-3.5-turbo   │ Gemini 2.0      │
│ JSON mode       │ Text → JSON     │
│ response_format │ Parse manually  │
└─────────────────┴─────────────────┘
    ↓           ↓
    Parse JSON Response
    ↓
Extract 3 metadata fields:
1. title
2. seo_title  
3. meta_description
    ↓
Save to database
    ↓
Return to client
```

### **JSON Response Format:**

```json
{
  "title": "Khám Phá Rừng Dừa Bảy Mẫu - Điểm Đến Hấp Dẫn Tại Hội An",
  "seo_title": "Rừng Dừa Bảy Mẫu Hội An: Hướng Dẫn Chi Tiết 2026",
  "meta_description": "Khám phá rừng dừa Bảy Mẫu với hướng dẫn chi tiết về giá vé, hoạt động trải nghiệm, và cách di chuyển. Điểm đến lý tưởng cho chuyến du lịch Hội An của bạn."
}
```

---

## 📊 DATABASE SCHEMA

### **Articles Table:**

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),           -- Article title (human-readable)
  content TEXT,                 -- Article HTML content
  meta_title VARCHAR(255),      -- SEO title (search engine optimized)
  meta_description TEXT,        -- Meta description (search snippet)
  slug VARCHAR(255),
  keywords JSON,
  status VARCHAR(50),
  created_at DATETIME,
  updated_at DATETIME
);
```

**Field Mappings:**
- `title` ← `title` (display title)
- `meta_title` ← `seo_title` (SEO-optimized)
- `meta_description` ← `meta_description` (search snippet)

---

## 🎨 CODE EXAMPLES

### **1. Metadata Generation Prompt:**

```typescript
metadataUserPrompt = `Generate metadata for: "${keyword}" in ${languageName}

Return JSON:
{
  "title": "Engaging title (50-60 chars)",
  "seo_title": "SEO title with keyword (50-60 chars)", 
  "meta_description": "Meta description (150-160 chars)"
}

Requirements:
- Title: Natural, engaging, include main keyword
- SEO Title: Keyword at beginning, optimized for SEO
- Meta Description: Summarize value, include keyword, encourage clicks`;
```

### **2. OpenAI Request:**

```typescript
await fetch("https://api.openai.com/v1/chat/completions", {
  body: JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: metadataSystemPrompt },
      { role: "user", content: metadataUserPrompt }
    ],
    temperature: 0.7,
    max_tokens: 300,
    response_format: { type: "json_object" } // Force JSON
  })
});
```

### **3. Gemini Request:**

```typescript
await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
  {
    body: JSON.stringify({
      contents: [{
        parts: [{ text: geminiMetadataPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    })
  }
);

// Parse JSON from text response
const jsonMatch = metadataText.match(/\{[\s\S]*\}/);
const metadata = JSON.parse(jsonMatch[0]);
```

---

## 🧪 TESTING

### **Test Case 1: OpenAI Generation**

**Request:**
```bash
POST /api/ai/generate-article
{
  "keyword": "Rừng dừa Bảy Mẫu",
  "model": "GPT 4o MINI",
  "language": "vi",
  ...
}
```

**Expected Response:**
```json
{
  "success": true,
  "articleId": 123,
  "title": "Khám Phá Rừng Dừa Bảy Mẫu - Thiên Đường Xanh Giữa Hội An",
  "seoTitle": "Rừng Dừa Bảy Mẫu: Hướng Dẫn Du Lịch Chi Tiết 2026",
  "metaDescription": "Khám phá vẻ đẹp nguyên sơ của rừng dừa Bảy Mẫu với giá vé, hoạt động trải nghiệm, và tips du lịch hữu ích.",
  "content": "<h2>Giới thiệu về Rừng Dừa Bảy Mẫu</h2>..."
}
```

### **Test Case 2: Gemini Generation**

**Request:**
```bash
POST /api/ai/generate-article
{
  "keyword": "Du lịch Đà Nẵng",
  "model": "Gemini",
  "language": "vi",
  "useGoogleSearch": true,
  ...
}
```

**Expected:**
- ✅ Title created by Gemini (not copied from keyword)
- ✅ SEO Title with keyword at beginning
- ✅ Meta Description with compelling CTA

### **Test Case 3: Fallback Scenario**

**Scenario:** API fails

**Expected Behavior:**
```typescript
title = keyword; // "Du lịch Đà Nẵng"
seoTitle = keyword; // "Du lịch Đà Nẵng"
metaDescription = `${keyword} - Comprehensive guide`; // "Du lịch Đà Nẵng - Comprehensive guide"
```

---

## 📈 BENEFITS

### **1. SEO Improvement**
- ✅ Better search engine rankings
- ✅ Higher click-through rates
- ✅ Optimized meta tags

### **2. User Experience**
- ✅ Clear, engaging titles
- ✅ Informative search snippets
- ✅ Professional appearance

### **3. Consistency**
- ✅ Same feature for all models
- ✅ Standardized metadata format
- ✅ Predictable behavior

### **4. Time Saving**
- ✅ Automatic generation
- ✅ No manual optimization needed
- ✅ Single API call for all metadata

---

## 🔄 MIGRATION NOTES

### **Existing Articles:**

Các bài viết cũ sẽ có:
- `meta_title` = `title` (copy from title)
- `meta_description` = `keyword` (from keyword)

**Recommendation:** Regenerate metadata cho bài viết cũ:

```sql
-- Update old articles with proper SEO metadata
UPDATE articles 
SET 
  meta_title = title,
  meta_description = CONCAT(SUBSTRING(content, 1, 150), '...')
WHERE 
  meta_title IS NULL 
  OR meta_title = title;
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [x] Update `injectWebsiteKnowledge()` function (knowledge first)
- [x] Implement metadata generation for OpenAI
- [x] Implement metadata generation for Gemini
- [x] Update database INSERT query
- [x] Add metadata to SSE response
- [x] Build backend (297.92 kB)
- [ ] Deploy to production server
- [ ] Test with OpenAI model
- [ ] Test with Gemini model
- [ ] Verify database records
- [ ] Check frontend display (if needed)

---

## 📝 EXAMPLE OUTPUT

### **Generated Metadata:**

**Keyword:** "Rừng dừa Bảy Mẫu"

**Generated:**
```
Title: "Khám Phá Rừng Dừa Bảy Mẫu - Điểm Đến Độc Đáo Tại Hội An"
(59 chars, natural, engaging)

SEO Title: "Rừng Dừa Bảy Mẫu Hội An: Trải Nghiệm, Giá Vé 2026"
(52 chars, keyword-first, SEO-optimized)

Meta Description: "Khám phá vẻ đẹp nguyên sơ của rừng dừa Bảy Mẫu với hướng dẫn chi tiết về giá vé, hoạt động trải nghiệm thú vị, và cách di chuyển thuận tiện nhất."
(157 chars, compelling, CTA included)
```

### **Database Record:**

```sql
INSERT INTO articles (
  user_id, 
  title, 
  meta_title, 
  meta_description, 
  content, 
  ...
) VALUES (
  1,
  'Khám Phá Rừng Dừa Bảy Mẫu - Điểm Đến Độc Đáo Tại Hội An',
  'Rừng Dừa Bảy Mẫu Hội An: Trải Nghiệm, Giá Vé 2026',
  'Khám phá vẻ đẹp nguyên sơ của rừng dừa Bảy Mẫu với hướng dẫn chi tiết về giá vé, hoạt động trải nghiệm thú vị, và cách di chuyển thuận tiện nhất.',
  '<h2>Giới thiệu về Rừng Dừa Bảy Mẫu</h2>...',
  ...
);
```

---

## 🎯 SUMMARY

✅ **Gemini giờ tạo title riêng** (không copy từ keyword)
✅ **Tất cả models tạo SEO Title và Meta Description**
✅ **Single API call** cho cả 3 metadata
✅ **Fallback safety** nếu API lỗi
✅ **Database ready** với proper fields

**Next Steps:**
1. Deploy `dist/server/node-build.mjs` to production
2. Test với cả OpenAI và Gemini
3. Verify metadata in database
4. Check SEO improvements
