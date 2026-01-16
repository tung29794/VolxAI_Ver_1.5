# 🆕 CÂP NHẬT: THÊM PROMPT TẠO TIÊU ĐỀ BÀI VIẾT

**Ngày cập nhật:** 8 Tháng 1, 2026  
**Phát hiện:** Feature tạo tiêu đề bài viết đang hardcode  
**Trạng thái:** ✅ Đã sửa

---

## 🔍 Vấn Đề Phát Hiện

### Feature Bị Bỏ Sót

**Location:** `server/routes/ai.ts` - Dòng 1443-1479 (trong `handleGenerateArticle`)

**Mô tả:** 
- Khi AI tạo bài viết, nó tự động tạo tiêu đề cho bài viết đó
- Tiêu đề này đang được tạo bằng **HARDCODE prompt**
- Không có trong database để admin quản lý

### Code Hardcode (TRƯỚC)

```typescript
// Generate title from keyword with language support
const languageName = languageNames[language] || "Vietnamese";
const titleResponse = await fetch(
  "https://api.openai.com/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional content writer. Generate a compelling, SEO-friendly title for an article.
IMPORTANT: You MUST write the title in ${languageName} language ONLY.
Return ONLY the title text, nothing else.`,
        },
        {
          role: "user",
          content: `Generate a title in ${languageName} for an article about: "${keyword}"
Remember: The title MUST be in ${languageName} language.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    }),
  },
);
```

**Vấn đề:**
- ❌ Prompt hardcode trong code
- ❌ Không thể chỉnh sửa qua Admin Dashboard
- ❌ Phải sửa code + build + deploy để thay đổi

---

## ✅ Giải Pháp

### 1. Thêm Prompt vào Database

**SQL Executed:**
```sql
INSERT INTO ai_prompts 
(feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES 
(
  'generate_article_title',
  'Tạo tiêu đề bài viết',
  'Tạo tiêu đề hấp dẫn, tối ưu SEO cho bài viết khi AI đang viết',
  'Generate a title in {language} for an article about: "{keyword}"
Remember: The title MUST be in {language} language.',
  'You are a professional content writer. Generate a compelling, SEO-friendly title for an article.
IMPORTANT: You MUST write the title in {language} language ONLY.
Return ONLY the title text, nothing else.',
  '["keyword", "language"]',
  1
);
```

**Kết quả:**
- ✅ Prompt ID: **22**
- ✅ Feature Name: `generate_article_title`
- ✅ Active: `1`

---

### 2. Cập Nhật Code Load từ Database

**Code Mới (SAU):**
```typescript
// ========== GENERATE TITLE FROM DATABASE PROMPT ==========
const languageName = languageNames[language] || "Vietnamese";

// Load title prompt from database
const titlePromptTemplate = await loadPrompt('generate_article_title');

let titleSystemPrompt = "";
let titleUserPrompt = "";

if (titlePromptTemplate) {
  // Use database prompt with variable interpolation
  titleSystemPrompt = interpolatePrompt(titlePromptTemplate.system_prompt, {
    language: languageName,
  });
  
  titleUserPrompt = interpolatePrompt(titlePromptTemplate.prompt_template, {
    keyword: keyword,
    language: languageName,
  });
} else {
  // FALLBACK: Use hardcoded prompts
  titleSystemPrompt = `You are a professional content writer...`;
  titleUserPrompt = `Generate a title in ${languageName}...`;
}

const titleResponse = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: titleSystemPrompt, // ✅ Từ database
      },
      {
        role: "user",
        content: titleUserPrompt, // ✅ Từ database
      },
    ],
    temperature: 0.7,
    max_tokens: 100,
  }),
});
// ========================================================
```

**Lợi ích:**
- ✅ Load prompt từ database
- ✅ Admin có thể chỉnh sửa qua Dashboard
- ✅ Có fallback nếu database lỗi
- ✅ Variables: `{keyword}`, `{language}`

---

### 3. Build Thành Công

```bash
npm run build
✓ Frontend: 2.14s
✓ Backend: 183ms
```

---

## 📊 Trạng Thái Cập Nhật

### Prompts Active Trong Database

| ID | Feature Name | Display Name | Variables |
|----|--------------|--------------|-----------|
| 12 | expand_content | Mở rộng nội dung | content, language_instruction |
| 13 | rewrite_content | Viết lại nội dung | text, style, language_instruction |
| 14 | generate_article | Tạo bài viết hoàn chỉnh | keyword, language_instruction, tone, length_instruction |
| 15 | generate_seo_title | Tạo tiêu đề SEO | content, keywords, language |
| 16 | generate_meta_description | Tạo Meta Description | content, keywords, language |
| 21 | generate_outline | Tạo dàn ý bài viết | keyword, language, length_description, tone, h2_count, h3_per_h2 |
| 22 | **generate_article_title** | **Tạo tiêu đề bài viết** | **keyword, language** |

**Tổng cộng:** 7 prompts active ✅

---

## 🔍 So Sánh

### TRƯỚC Cập Nhật

| Metric | Value |
|--------|-------|
| Total prompts | 6 |
| Features hardcode | 1 (generate_article_title) |
| Admin control | 6/7 features (85.7%) |

### SAU Cập Nhật

| Metric | Value |
|--------|-------|
| Total prompts | 7 |
| Features hardcode | 0 |
| Admin control | 7/7 features (100%) ✅ |

---

## 🎨 Cách Sử Dụng

### Chỉnh Sửa Prompt Tiêu Đề Bài Viết

1. Vào: https://volxai.com/admin
2. Tab: **"AI Prompts"**
3. Tìm: **"Tạo tiêu đề bài viết"** (generate_article_title)
4. Click **"Edit"**
5. Chỉnh sửa:
   - **System Prompt:** Hướng dẫn AI về cách tạo tiêu đề
   - **Prompt Template:** Template với variables `{keyword}`, `{language}`
6. Click **"Save"**

**Kết quả:** Tiêu đề bài viết sẽ được tạo theo prompt mới ngay lập tức!

---

## 🧪 Test

### Test Feature

1. Vào: https://volxai.com/editor
2. Click: **"Tạo bài viết"** hoặc **"Generate Article"**
3. Nhập:
   - Keyword: "AI Technology"
   - Language: Vietnamese
   - Chọn các tùy chọn khác
4. Click: **"Generate"**

**Expected:**
- ✅ Bài viết được tạo thành công
- ✅ Tiêu đề được tạo tự động bằng tiếng Việt
- ✅ Tiêu đề liên quan đến keyword
- ✅ Không có errors trong console

---

## 📄 Các File Đã Cập Nhật

### 1. Database
- Table: `ai_prompts`
- New record: ID 22 (`generate_article_title`)

### 2. Code
- File: `server/routes/ai.ts`
- Lines: ~1443-1495 (updated)
- Function: `handleGenerateArticle`

### 3. Documentation
- **AI_PROMPTS_UPDATE_ARTICLE_TITLE.md** (file này)

---

## ✅ Checklist Verification

- [x] Prompt đã được thêm vào database (ID: 22)
- [x] Code đã được cập nhật load từ database
- [x] Build thành công không lỗi
- [x] Feature name: `generate_article_title`
- [x] Variables: `keyword`, `language`
- [x] Fallback mechanism implemented
- [x] Admin Dashboard hiển thị prompt

---

## 🎉 Kết Luận

**✅ HOÀN THÀNH CẬP NHẬT!**

**Bây giờ có 7 prompts active - 100% load từ database!**

**Features quản lý qua database:**
1. ✅ Rewrite Content
2. ✅ Expand Content (Write More)
3. ✅ Generate Article
4. ✅ Generate SEO Title
5. ✅ Generate Meta Description
6. ✅ Generate Outline
7. ✅ **Generate Article Title** (Mới thêm)

**Lợi ích:**
- ✅ Admin toàn quyền kiểm soát tất cả AI prompts
- ✅ Không còn hardcode trong code
- ✅ Chỉnh sửa prompts không cần restart server
- ✅ Zero downtime updates

---

**📌 Ghi chú:** Đây là cập nhật bổ sung cho migration trước đó. Xem các file khác:
- `TONG_KET_AI_PROMPTS.md`
- `AI_PROMPTS_DATABASE_MIGRATION_REPORT.md`
- `AI_PROMPTS_DOCS_INDEX.md`
